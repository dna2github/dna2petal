/*
 * @auther: Seven Lju
 * @date:   2015-08-06
 */
'use strict';

function toByteArray(arr) {
  var n = arr.length;
  if (typeof(n) === 'undefined') {
    // if IE 10+, arr is ArrayBuffer
    n = arr.byteLength;
    return new Uint8Array(arr, 0, n);
  }
  var b = new Uint8Array(n);
  for (var i=0; i<n; i++) {
    b[i] = arr[i].charCodeAt(0);
  }
  arr = null;
  return b;
}

function uploadBlob(url, offset, size, data) {
  return $.ajax({
    url: url,
    method: 'POST',
    data: toByteArray(data),
    cache: false,
    contentType: 'application/octet-stream',
    processData: false,
    dataType: 'json',
    headers: {
      'UPLOAD-FILE-OFFSET': offset,
      'UPLOAD-FILE-SIZE': size
    }
  });
  data = null;
}

function uploadFile(url, file) {
  console.log(file);
  var f, i, j, n, step, method;
  i = 0;
  step = 2*1024*1024; // 2MB
  n = file.size;
  f = new FileReader();
  f.addEventListener('loadend', event_reader_loadend, false);
  // IE 10+ does not have the method readAsBinaryString
  method = 'readAsBinaryString';
  if (!f[method]) method = 'readAsArrayBuffer';
  f[method](file.slice(0, step));

  var timestart = new Date();
  function event_reader_loadend(e) {
    if (e.target.readyState === FileReader.DONE) {
      uploadBlob(url, i, n, e.target.result).done(function () {
        console.log('partial complete ', i);
        i += step;
        if (i >= n) {
          f = null;
          console.log( ((new Date() - timestart)/1000) );
          timestart = null;
          return;
        }
        f.readAsBinaryString(file.slice(i, i + step));
      }).fail(function () {
        console.log('oops and stop');
        f = null;
        // TODO: recoverable
      });
    }
  }
}

function fnFile(e) {
  uploadFile('/upload/', e.target.files[0]);
}

$('#filebox').on('change', fnFile);

