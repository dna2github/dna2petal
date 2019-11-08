(function (window, document) {

   function Uploader(auth) {
      this.file = null;
      this.auth = auth;
      this.step = 2*1024*1024; // 2MB
      this.offset = 0;
      this.paused = true;
   }
   Uploader.prototype = {
      initFileReader: function () {
         var _this = this;
         this.reader = new FileReader();
         this.reader.addEventListener('loadend', event_reader_loadend);
         function event_reader_loadend(e) {
            if (e.target.readyState === FileReader.DONE) {
               // TODO: if (_this.offset === 0) check dup
               _this.uploadBlob(_this.file_id, _this.file.size, _this.offset, e.target.result).then(function () {
                  console.log('[upload complete] partial', _this.offset);
                  _this.offset += _this.step;
                  if (_this.offset >= _this.file.size) {
                     console.log('[upload complete]');
                     ajax({
                        url: '/api/upload/close',
                        method: 'POST',
                        json: Object.assign({
                           file_id: _this.file_id,
                        }, _this.auth)
                     });
                     return;
                  }
                  if (!_this.paused) _this.reader.readAsBinaryString(_this.file.slice(_this.offset, _this.offset + _this.step));
               }, function (err) {
                  console.log(err, '[transfer error] paused');
                  _this.paused = true;
               });
            }
         }
      },
      uploadBlob: function (file_id, size, offset, data) {
         var _this = this;
         return new Promise(function (r, e) {
            ajax({
               url: '/api/upload/data',
               method: 'POST',
               json: Object.assign({
                  data: data,
                  file_id: file_id,
                  file_offset: offset,
                  file_size: size
               }, env.user)
            }, function () {
               console.log('[upload blob] done'); r();
            }, function () {
               console.log('[upload blob] error'); e();
            });
         });
      },
      uploadFile: function (file) {
         console.log('[uploading]', this.file);
         var _this = this;
         _this.file = file;
         _this.file_id = null;
         _this.offset = 0;
         _this.step = 2*1024*1024; // 2MB
         ajax({
            url: '/api/upload/open',
            method: 'POST',
            json: Object.assign({
               filename: _this.file.name,
               filesize: _this.file.size
            }, _this.auth)
         }, function (data) {
            var json = JSON.parse(data);
            _this.paused = false;
            _this.file_id = json.file_id;
            // IE 10+: readAsArrayBuffer
            _this.initFileReader();
            _this.reader.readAsBinaryString(_this.file.slice(0, _this.step));
         }, function (err) {
            console.log('[open] error');
         });
      },
      pause: function () {
         this.paused = true;
      },
      resume: function () {
         this.paused = false;
         this.reader.readAsBinaryString(this.file.slice(this.offset, this.offset + this.step));
      },
      cancel: function () {
         this.offset = 0;
         this.paused = true;
         ajax({
            url: '/api/upload/close',
            method: 'POST',
            json: Object.assign({
               file_id: this.file_id,
               cancel: true,
            }, this.auth)
         });
         this.file_id = null;
      }
   };

   window.BomUploader = Uploader;
})(window, document);