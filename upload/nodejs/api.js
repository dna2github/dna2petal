const i_fs = require('fs');
const i_path = require('path');
const i_uuid = require('uuid');
const i_utils = require('./utils');

const system = {
   upload: {
      tmpdir: i_path.resolve(process.env.UPLOAD_TMPDIR),
      storage: process.env.UPLOAD_STORAGE || 'file://',
      maxUpNpU: parseInt(process.env.UPLOAD_UP_N_PER_USER || '5'),
      maxUpN: parseInt(process.env.UPLOAD_UP_N || '100'),
      maxSlice: parseInt(process.env.UPLOAD_MAX_SLICE || '20') * 1024 * 1024 /* 20 MB */,
   },
   files: {
      uploading: {
         '@N': 0,
         // <user_name>: { '@N': 0, <uuid>: ... }
         // <uuid>: { mtime, hash, size, filename, dup_hash, ... }
      },
   },
};

const storage = {
   file: {
      baseDir: '',
      move: async (username, tmpfile, filename) => {
         // TODO: gurantee filename do not contains '..'
         let finalname = i_path.join(storage.file.baseDir, username, filename);
         let dirname = i_path.dirname(finalname);
         await helper.mkdir(dirname);
         await helper.rename(tmpfile, finalname);
      },
      list: async (username, dirname) => {
         let finalname = i_path.join(storage.file.baseDir, username, dirname);
         return await helper.readDirectory(finalname);
      },
   },
};

function getStorage() {
   let parts = system.upload.storage.split('://');
   let protocol = parts[0];
   let dirname = parts[1];
   if (!dirname) dirname = system.upload.tmpdir;
   dirname = i_path.resolve(dirname);
   let storage_obj = storage[protocol] || storage['file'];
   storage_obj.baseDir = dirname;
   return storage_obj;
}

function validatePath(filename) {
   return !(
      filename === '..' ||
      filename.endsWith('/..') ||
      filename.startsWith('../') ||
      filename.indexOf('/../') >= 0
   );
}

function toByteArray(arr) {
   var n = arr.length;
   var b = new Uint8Array(n);
   for (var i = 0; i < n; i++) {
      b[i] = arr[i].charCodeAt(0);
   }
   arr = null;
   return b;
}

function cleanup() {
   Object.keys(system.files.uploading).forEach((username) => {
      if (username === '@N') return;
      let profile = system.files.uploading[username];
      let count = 0;
      Object.keys(profile).forEach((uid) => {
         if (uid === '@N') return;
         let file_obj = profile[uid];
         if (!file_obj) {
            delete profile[uid];
            return;
         }
         if (file_obj.status === 'closed') {
            delete profile[uid];
            return;
         }
         count ++;
      });
      if (!count) {
         delete system.files.uploading[username];
      }
   });
}

function guranteeUuid(profile) {
   let uid = i_uuid.v4();
   while (profile[uid]) {
      uid = i_uuid.v4();
   }
   profile[uid] = {};
   return uid;
}

const helper = {
   lstat: async (filename) => {
      return new Promise((r, e) => {
         i_fs.lstat(filename, (err, stat) => {
            if (err) return e(err);
            r(stat);
         });
      });
   }, // lstat
   rename: async (filename, new_filename) => {
      return new Promise((r, e) => {
         i_fs.rename(filename, new_filename, (err) => {
            if (err) return e(err);
            r();
         });
      });
   }, // rename
   unlink: async (filename) => {
      return new Promise((r, e) => {
         i_fs.unlink(filename, (err) => {
            if (err) return e(err);
            r();
         });
      });
   }, //unlink
   readdir: async (dirname) => {
      return new Promise((r, e) => {
         i_fs.readdir(dirname, (err, list) => {
            if (err) return e(err);
            r(list);
         });
      });
   }, //readdir
   readDirectory: async (dirname) => {
      let list = await helper.readdir(dirname);
      for (let i = 0, n = list.length; i < n; i++) {
         let item = list[i];
         let filename = i_path.join(dirname, item);
         let stat = await helper.lstat(filename);
         if (stat.isDirectory()) {
            list[i] = list[i] + i_path.sep;
         }
      }
      return list;
   }, // readDirectory
   mkdir: async (dirname) => {
      let parent_dirname = i_path.dirname(dirname);
      let stat, ok;
      ok = false;
      try {
         stat = await helper.lstat(parent_dirname);
         ok = stat.isDirectory();
      } catch(e) {
         // no such file or directory
         await helper.mkdir(parent_dirname);
         ok = true;
      }
      if (!ok) return Promise.reject();
      try {
         stat = await helper.lstat(dirname);
         if (stat.isDirectory()) return Promise.resolve();
         return Promise.reject();
      } catch (e) {
         // no such directory
      }
      return new Promise((r, e) => {
         i_fs.mkdir(dirname, (err) => {
            if (err) return e(err);
            r();
         });
      });
   }, // mkdir
   open: async (filename, flags) => {
      return new Promise((r, e) => {
         i_fs.open(filename, flags, (err, fd) => {
            if (err) return e(err);
            r(fd);
         });
      });
   }, // open
   close: async (fd) => {
      return new Promise((r, e) => {
         i_fs.close(fd, (err) => {
            if (err) return e(err);
            r();
         });
      });
   }, // close
   write: async (fd, buf, size, offset) => {
      return new Promise((r, e) => {
         i_fs.write(fd, buf, 0, size, offset, (err, n) => {
            if (err) return e(err);
            r(n);
         });
      });
   }, // write
   openOrCreate: async (filename) => {
      try {
         return await helper.open(filename, 'r+');
      } catch(e) {
         return await helper.open(filename, 'wx');
      }
   }, // open_or_create
   saveData: async (filename, offset, size, buf) => {
      let dirname = i_path.dirname(filename);
      await helper.mkdir(dirname);
      let fd;
      if (offset === 0) {
         fd = await helper.open(filename, 'w');
      } else {
         fd = await helper.open(filename, 'r+');
      }
      let n = await helper.write(fd, buf, size, offset);
      fd && await helper.close(fd);
      return n;
   }, // saveData
};

const api = {
   list: async (req, res, options) => {
      let username = options.json.username;
      let path = options.json.path;

      if (!path) path = '/';
      let storage_obj = getStorage();
      let list = await storage_obj.list(username, path);
      i_utils.Web.rjson(res, {
         list, base: path || '/'
      });
   },
   open: async (req, res, options) => {
      let username = options.json.username;
      let filename = options.json.filename;
      let filesize = parseInt(options.json.filesize);

      if (!filename || !filesize) return i_utils.Web.e400(res);
      // TODO: limit filename length
      if (!validatePath(filename)) return i_utils.Web.e400(res);
      if (system.files.uploading['@N'] >= system.upload.maxUpN) return i_utils.Web.e403(res);
      let profile = system.files.uploading[username];
      if (!profile) {
         profile = { '@N': 0 };
         system.files.uploading[username] = profile;
      }
      if (profile['@N'] >= system.upload.maxUpNpU) return i_utils.Web.e403(res);
      system.files.uploading['@N'] ++;
      profile['@N'] ++;

      let uid = guranteeUuid(profile);
      let file_obj = profile[uid];
      file_obj.mtime = new Date().getTime();
      file_obj.active_mtime = new Date().getTime();
      file_obj.size = filesize;
      file_obj.filename = filename; // TODO: normalize filename
      file_obj.status = 'opened';
      // hash, dup_hash
      res.end(`{ "file_id": "${uid}" }`);
   },
   close: async (req, res, options) => {
      let username = options.json.username;
      let uid = options.json.file_id;
      let cancel = !!options.json.cancel;

      if (!uid) return i_utils.Web.e400(res);
      let profile = system.files.uploading[username];
      if (!profile) return i_utils.Web.e400(res);
      if (uid === '@N') return i_utils.Web.e403(res);
      let file_obj = profile[uid];
      if (!file_obj) return i_utils.Web.e400(res);
      if (cancel) {
         let filename = i_path.join(system.upload.tmpdir, username, uid);
         try { await helper.unlink(filename); } catch(err) {}
      } else if (file_obj.status !== 'error') {
         // TODO: calculate file hash, dup_hash and file size for check
         let tmpfile = i_path.join(system.upload.tmpdir, username, uid);
         await getStorage().move(username, tmpfile, file_obj.filename);
      }
      file_obj.active_mtime = new Date().getTime();
      profile['@N'] --;
      system.files.uploading['@N'] --;
      file_obj.status = 'closed';
      // to defeat DoS attack
      // where open and close many files to create many file objects in memory
      if (Object.keys(profile).length > system.upload.maxUpNpU + 1) {
         cleanup();
      }
      res.end(`{ "file_id": "${uid}" }`);
   },
   data: async (req, res, options) => {
      let username = options.json.username;
      let uid = options.json.file_id;
      if (!uid) return i_utils.Web.e400(res);
      let profile = system.files.uploading[username];
      if (!profile) return i_utils.Web.e400(res);
      if (uid === '@N') return i_utils.Web.e403(res);
      let file_obj = profile[uid];
      if (!file_obj) return i_utils.Web.e400(res);
      if (file_obj.size < options.json.file_offset) return i_utils.Web.e403(res);
      if (options.json.data.length > system.upload.maxSlice) return i_utils.Web.e403(res);
      let filename = i_path.join(system.upload.tmpdir, username, uid);
      await helper.saveData(filename, options.json.file_offset, options.json.data.length, toByteArray(options.json.data));
      res.end(`{ "file_id": "${uid}" }`);
   },
};

i_utils.Web.require_login_batch(api);

module.exports = api;
