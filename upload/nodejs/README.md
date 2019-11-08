```js
var env = { user: { } };
var uploader = new window.LargeFileUploader(env.user);

document.getElementById('btn_upload').addEventListener('click', function(evt) {
   var input_file = document.getElementById('input_file');
   var file_obj = input_file.files[0];
   if (!file_obj) return;
   uploader.uploadFile(file_obj);
});
document.getElementById('btn_pause').addEventListener('click', function(evt) {
   uploader.pause();
});
document.getElementById('btn_resume').addEventListener('click', function(evt) {
   uploader.resume();
});
document.getElementById('btn_cancel').addEventListener('click', function(evt) {
   uploader.cancel();
});

```
