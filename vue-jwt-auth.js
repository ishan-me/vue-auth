module.exports = (function () {

    // Default

    function _beforeEach(transition) {
        var roles,
            auth = _toArray(transition.to.auth);

        if (auth && (auth === true || auth.constructor === Array)) {
            if ( ! this.check()) {
                this.$router.replace(this.getOption('authRedirect'));
            }
            else if (auth.constructor === Array && ! _compare(auth, _toArray(this.user()[this.getOption('rolesVar')]))) {
                this.$router.replace(this.getOption('forbiddenRedirect'));
            }
            else {
                return transition.next();
            }
        }
        else if (auth === false && this.check()) {
            this.$router.replace(this.getOption('notFoundRedirect'));
        }
        else {
            return transition.next();
        }
    }

    function _userData(resp) {
        return resp.data;
    }

    function _cookieDomain() {
        return window.location.hostname;
    }

    // Utils

    function _getUrl() {
        var port = window.location.port;

        return window.location.protocol + '//' + window.location.hostname + (port ? ':' + port : '');
    }

    function _compare(one, two) {
        var i, ii;

        one = _toArray(one);
        two = _toArray(two);

        if (one.constructor !== Array || two.constructor !== Array) {
            return false;
        }

        for (i = 0, ii = one.length; i < ii; i++) {
            if (two.indexOf(one[i]) >= 0) {
                return true;
            }
        }

        return false;
    }

    function _toArray(val) {
        return (typeof val) === 'string' ? [val] : val;
    }

    // Remember Me
    
    function _setCookie(name, value, timeOffset) {
        var domain  = this.getOption('cookieDomain').call(this),
            expires = (new Date((new Date).getTime() + timeOffset)).toUTCString();

        document.cookie = (name + '=' + value + '; domain=' + domain + '; path=/;' + (timeOffset ? ' expires=' + expires + ';' : '') );
    }

    function _setRememberMeCookie(rememberMe) {
        _setCookie.call(this,
            'rememberMe',
            rememberMe === true ? 'true' : 'false',
            rememberMe === true ? 12096e5 : undefined
        );
    }

    function _removeRememberMeCookie() {
        _setCookie.call(this, 'rememberMe', 'false', -12096e5);
    }

    // Token

    function _setToken(token) {
        if (token) {
            localStorage.setItem( (this.other() ? 'login-as-' : '') + this.getOption('tokenName'), token);
        }
    }

    function _getToken() {
        return localStorage.getItem( (this.other() ? 'login-as-' : '') + this.getOption('tokenName'));
    }

    function _removeToken() {
        localStorage.removeItem( (this.other() ? 'login-as-' : '') + this.getOption('tokenName'));
    }

    function _refreshToken() {
        if (_getToken.call(this)) {
            this.$http.get(this.getOption('tokenUrl'));
        }
    }

    // Router
    
    function _setRoute(route, router) {
        this.$route = route;
        this.$router = router;
    }

    // Auth
    
    function _login(path, data, rememberMe, options) {
        options = options || {};

        this.$http.post(path, data, function(resp) {
            var _this = this;

            _setRememberMeCookie.call(this, rememberMe);

            _setToken.call(this, resp[this.getOption('tokenVar')]);

            this.authenticated = null;
            
            if (options.success) {
                options.success.call(this, resp);
            }
            this.fetch(function () {
                if (_this.getOption('loginRedirect') && _this.check()) {
                    
                    _this.$router.go(_this.getOption('loginRedirect'));
                }
            });
        }, {
            error: function (resp) {
                if (options.error) {
                    options.error.call(this, resp);
                }
            }
        });
    }

    function _social(type, data, rememberMe, options) {
        var state,
            params = '';

        data = data || {};

        if (data.code) {
            state = JSON.parse(this.$route.query.state);

            _login.call(this, this.getOption(type + 'Url'), data, state.rememberMe, state.redirect, options);
        }
        else {
            data.state = data.state || {};
            data.state.rememberMe = rememberMe === true ? true : false;
            data.state.redirect = this.getOption('loginRedirect') || '';

            data.appId = data.appId || this.getOption(type + 'AppId');
            data.clientId = data.clientId || this.getOption(type + 'ClientId');
            data.scope = data.scope || this.getOption(type + 'Scope');
            data.redirect = data.redirect || this.getOption(type + 'Redirect');

            params = '?client_id=' + data.appId + '&redirect_uri=' + data.redirect + '&scope=' + data.scope + '&response_type=code&state=' + JSON.stringify(data.state);

            if (type === 'facebook') {
                window.location = 'https://www.facebook.com/v2.5/dialog/oauth' + params;
            }
            else if (type === 'google') {
                window.location = 'https://accounts.google.com/o/oauth2/auth' + params;
            }
            // else if (type === 'twitter') {
            //     window.location = 'https://oauth.twitter.com/2/authorize?oauth_callback_url=' + data.redirect + '&oauth_mode=flow_web_client&oauth_client_identifier=' + data.appId + '&redirect_uri=' + data.redirect + '&response_type=token&client_id=' + data.clientId;
            // }
        }
    }

    function _fetch(cb) {
        cb = cb || function () {};

        this.$http.get(this.getOption('fetchUrl'), function(resp) {
            this.authenticated = true;
            this.data = this.getOption('userData').call(this, resp);
            this.loaded = true;

            return cb();
        }, {
            error: function() {
                this.loaded = true;

                return cb();
            }
        });
    }

    // Plugin

    var Auth = {
        options: {
            authType          : 'bearer',

            fetchUrl          : '/auth/user',
            tokenUrl          : '/auth/token',
            loginUrl          : '/auth/login',
            loginAsUrl        : '/auth/login-as',

            authRedirect      : '/login',
            loginRedirect     : '/account',
            logoutRedirect    : '/',
            notFoundRedirect  : '/404',
            forbiddenRedirect : '/403',

            rolesVar          : 'roles',
            tokenVar          : 'token',
            tokenName         : 'jwt-auth-token',
            
            cookieDomain      : _cookieDomain,
            userData          : _userData,
            beforeEach        : _beforeEach,
            
            facebookUrl       : '/auth/facebook',
            facebookAppId     : '',
            facebookScope     : 'email',
            facebookRedirect  : _getUrl() + '/login/facebook',
            
            googleUrl         : '/auth/google',
            googleAppId       : '',
            googleScope       : 'https://www.googleapis.com/auth/plus.me https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/plus.profile.emails.read',
            googleRedirect    : _getUrl() + '/login/google',
        },
        
        data: function () {
            return {
                data: null,
                loaded: false,
                authenticated: null
            };
        },

        created: function () {
            var _this = this;

            Vue.http.interceptors.push({

                // Send auth token on each request.
                request: function (req) {
                    var token = _getToken.call(_this);

                    if (token) {
                        if (_this.getOption('authType') === 'bearer') {
                            req.headers.Authorization = 'Bearer: ' + token;
                        }
                    }

                    return req;
                },

                // Reset auth token if provided in response.
                response: function (res) {
                    var authorization = res.headers('authorization');

                    if (authorization) {
                        authorization = authorization.split(' ');

                        if (authorization[1]) {
                            _setToken.call(this, authorization[1]);
                        }
                    }

                    return res;
                }
            });
        },

        methods: {

            // Options
            
            getOption: function (key) {
                return this.$options.options[key];
            },

            setOptions: function (options) {
                for (var i in options) {
                    this.$options.options[i] = options[i];
                }
            },

            // Login / Logout
            
            login: function (data, rememberMe, options) {
                _login.call(this, this.getOption('loginUrl'), data, rememberMe, options);
            },

            facebook: function (data, rememberMe, options) {
                _social.call(this, 'facebook', data, rememberMe, options);
            },

            google: function (data, rememberMe, options) {
                _social.call(this, 'google', data, rememberMe, options);
            },

            logout: function() {
                _removeRememberMeCookie.call(this);
                
                // Need to call twice to remove both tokens.
                _removeToken.call(this);
                _removeToken.call(this);

                this.authenticated = false;
                this.data = null;

                if (this.$route.auth && this.getOption('logoutRedirect')) {
                    this.$router.go(this.getOption('logoutRedirect'));
                }
            },

            // User
            
            check: function (role) {
                if (this.data !== null) {
                    if (role) {
                        return _compare(role, this.data[this.getOption('rolesVar')]);
                    }

                    return true;
                }

                return false;
            },

            fetch: function(cb) {
                cb = cb || function () {};

                if ( ! this.loaded) {
                    _refreshToken.call(this);
                }

                if (this.authenticated === null && _getToken.call(this)) {
                    if ( ! document.cookie.match(/rememberMe/)) {
                        _removeToken.call(this);
                        
                        this.loaded = true;
                        
                        return cb();
                    }

                    this.authenticated = false;
                    
                    _fetch.call(this, cb);
                }
                else {
                    this.loaded = true;

                    return cb();
                }        
            },

            user: function() {
                return this.data;
            },

            ready: function() {
                return this.loaded;
            },

            // Login As

            loginAs: function(data, options) {
                options = options || {};

                this.$http.post(this.getOption('loginAsUrl'), data, function(resp) {
                    var _this = this;

                    localStorage.setItem('login-as-' + this.getOption('tokenName'), resp[this.getOption('tokenVar')]);
                    
                    if (options.success) {
                        options.success.call(this, resp);
                    }

                    _fetch.call(this, function () {
                        if (_this.getOption('loginRedirect') && _this.check()) {
                            _this.$router.go(_this.getOption('loginRedirect'));
                        }
                    });
                }, {
                    error: function (resp) {
                        if (options.error) {
                            options.error.call(this, resp);
                        }
                    }
                });
            },

            logoutAs: function(options) {
                var _this = this;

                localStorage.removeItem('login-as-' + this.getOption('tokenName'));
                
                _fetch.call(this, function () {
                    if (_this.$route.auth && _this.getOption('logoutRedirect')) {
                        _this.$router.go(_this.getOption('logoutRedirect'));
                    }
                });
            },

            other: function() {
                return localStorage.getItem('login-as-' + this.getOption('tokenName'));
            }
        }
    };

    return function install(Vue, options) {
        var auth = new Vue(Auth);

        auth.setOptions(options || {});

        Object.defineProperties(Vue.prototype, {
            $auth: {
                get: function () {
                    _setRoute.call(auth, this.$route, this.$router);

                    return auth;
                }
            }
        });

        // // Setup before each route change check.
        Vue.router.beforeEach(function (transition) {

            // Make sure to use $auth.fetch so context is loaded.
            transition.to.router.app.$auth.fetch(function () {
                auth.getOption('beforeEach').bind(auth)(transition);
            });
        }); 
    }
})();