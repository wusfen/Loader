/**

加载器
todo: js 并行加载与顺序执行
2015.10.26 by wushufen
2015.10.27

@example

wu.Loader.js(...).css(...).img(...).load(...);

wu.Loader.load({
    // base: 'http://example.com/view',
    data:[
        {src:'http://cdn.bootcss.com/jquery/3.0.0-alpha1/jquery.js', src2:'lib/jquery.js', type:'js'},
        {name:'background', src:'img/background.jpg', type:'img'},
    ],
    progress: function(e){
        // var progress = e.loaded/e.tatal
    },
    completed: function(e){
        // var img = e.result.imgName
    },
});

*/

var wu = wu || {};

wu.Loader = (function() {

    var result = [];
    /*
    [
        {name: 'jquery', src: 'lib/jquery.js', type: 'js', status: 'loaded', called: true },
        {name: 'tshirt', src: 'img/tshirt.png', type: 'img', status: 'loading', el: 'this'},
        {name: 'tshirt2', src: 'img/tshirt2.png', type: 'img', status: 'error', el: 'this'},
    ]
    */

    // todo
    function loadOne(obj, success, error) {
        var name = obj.name,
            src = obj.src,
            ext = src.substr(src.lastIndexOf('.') + 1),
            type = obj.type || ext,
            el;
        switch (type) {
            case 'js':
                el = document.createElement('script');
                el.onload = function() {
                    result.push(el);
                    success && success();
                };
                el.src = src;
                document.head.appendChild(el);
                break;
            case 'css':
                css(src, function() {
                    updateProgress(++loaded);
                });
                break;
            default:
                img(src, function() {
                    updateProgress(++loaded);
                }, result, name);
        }
    }

    function js(url, success, error) {
        var el = document.createElement('script');
        el.onload = function() {
            result.push(el);
            success && success();
        };
        el.onerror = function() {
            error && error();
        }
        el.src = url;
        document.head.appendChild(el);
        // el.parentNode.removeChild(el);
    }

    function runJsArrByOrder(data) {
        var i = 0;

        function loop() {
            if (i >= data.length) {
                return
            };
            var item = data[i];

            js(item.src, function() {
                console.log('run', item.src);
                i++;
                loop();
            }, function() {
                console.error('load error', item.src);
                // src2
                item.src2 && js(item.src2, function() {
                    i++;
                    loop();
                }, function() {
                    console.log('src2 load error', item.src2);
                })
            });
        }
        loop();
    }

    function css(url, success, error) {
        var el = document.createElement('link');
        styleOnload(el, function() {
            result.push(el);
            success && success();
        });
        el.type = 'text/ess';
        el.rel = 'stylesheet';
        el.href = url;
        document.head.appendChild(el);
    }

    function img(url, success, error) {
        var el = new Image;
        el.onload = function() {
            result.push(el);
            success && success();
        };
        el.src = url;
    }

    function load(options) {
        var loaded = 0,
            error = 0,
            tatal = options.data.length,
            result = {};

        function updateProgress() {
            // console.log('progress:', loaded, error, tatal);
            options.progress && options.progress({
                loaded: loaded,
                error: error,
                tatal: tatal
            });
            options.completed && (loaded + error) === tatal && options.completed({
                result: result
            });
        };
        for (var i = 0; i < tatal; i++) {
            var item = options.data[i],
                name = item.name,
                src = item.src || '',
                ext = src.substr(src.lastIndexOf('.') + 1),
                type = item.type || ext;
            if (!src) {
                ++loaded;
                continue;
            };
            switch (type) {
                case 'js':
                    js(src, function() {
                        updateProgress(++loaded);
                    });
                    break;
                case 'css':
                    css(src, function() {
                        updateProgress(++loaded);
                    });
                    break;
                default:
                    img(src, function() {
                        updateProgress(++loaded);
                    }, result, name);
            }
        };

        return this;
    }

    return {
        result: result,
        load: load,
        js: js,
        jsArr: runJsArrByOrder,
        css: css,
        img: img,
    };
}());

// load data-main
// setTimeout 防止阻塞 dom 加载
setTimeout(function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        var thisScript = scripts[i],
            main = thisScript.getAttribute('data-main');
        // main && wu.Loader.js(main.slice(-3) == '.js'? main: main+'.js');
        main && main.slice(-3) == '.js' && wu.Loader.js(main);
        // main && main.slice(-4) == '.css' && wu.Loader.css(main);
    };
}, 0);







// to do
function styleOnload(node, callback) {
    // for IE6-9 and Opera
    if (node.attachEvent) {
        node.attachEvent('onload', callback);
        // NOTICE:
        // 1. "onload" will be fired in IE6-9 when the file is 404, but in
        // this situation, Opera does nothing, so fallback to timeout.
        // 2. "onerror" doesn't fire in any browsers!
    }
    // polling for Firefox, Chrome, Safari
    else {
        setTimeout(function() {
            poll(node, callback);
        }, 0); // for cache
    }
}

function poll(node, callback) {
    if (callback.isCalled) {
        return;
    }
    var isLoaded = false;
    if (/webkit/i.test(navigator.userAgent)) { //webkit
        if (node['sheet']) {
            isLoaded = true;
        }
    }
    // for Firefox
    else if (node['sheet']) {
        try {
            if (node['sheet'].cssRules) {
                isLoaded = true;
            }
        } catch (ex) {
            // NS_ERROR_DOM_SECURITY_ERR
            if (ex.code === 1000) {
                isLoaded = true;
            }
        }
    }
    if (isLoaded) {
        // give time to render.
        setTimeout(function() {
            callback();
        }, 1);
    } else {
        setTimeout(function() {
            poll(node, callback);
        }, 1);
    }
}
