from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()

from django.http import HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt


def blankFile(f, size):
    print 'size =', size
    step = 10*1024*1024 # 10MB
    blank = '\0' * step
    while size > 0:
        if size < step:
            blank = '\0' * size
        f.write(blank)
        size -= step


@csrf_exempt
def savefile(request):
    if 'HTTP_UPLOAD_FILE_OFFSET' not in request.META:
        raise Http404()
    try:
        offset = int(request.META.get('HTTP_UPLOAD_FILE_OFFSET'))
        size = int(request.META.get('HTTP_UPLOAD_FILE_SIZE'))
        # it is better to have 2 kinds of apis:
        # - command api: open, close with uuid
        # - data api: like this function of savefiel to transport data
        if offset == 0:
            f = open('/tmp/upload.test', 'wb+')
            # reserve space in case of full disk
            blankFile(f, size)
        else:
            f = open('/tmp/upload.test', 'rb+')
        f.seek(offset)
        f.write(request.body)
        f.close()
    except:
        raise Http404()
    return HttpResponse('{}', content_type='application/json');


urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'upload.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),

    url(r'^upload/$', 'upload.urls.savefile'),
    url(r'^admin/', include(admin.site.urls)),
)
