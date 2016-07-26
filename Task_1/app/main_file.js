function Scope() {
    this.$$myWatchers = [];
    this.$$asyncExpect = [];
    this.$$digestExpectAfter = [];
    this.$$currentPhase = null;
}

Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
    var own = this;
    var myWatcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function() {

        },
        valueEq: !!valueEq
    };
    own.$$myWatchers.push(myWatcher);
    return function() {
        var index = own.$$myWatchers.indexOf(myWatcher);
        if (index >= 0) {
            own.$$myWatchers.splice(index, 1);
        }
    };
};

Scope.prototype.$beginPhase = function(phase) {
    if (this.$$currentPhase) {
        throw this.$$currentPhase + ' running now.';
    }
    this.$$currentPhase = phase;
};

Scope.prototype.$clearPhase = function() {
    this.$$currentPhase = null;
};

Scope.prototype.$$compare = function(valueFin, valueBegin, valueComp) {
    if (valueComp) {
        return _.isEqual(valueFin, valueBegin);
    } else {
        return valueFin === valueBegin ||
            (typeof valueFin === 'number' && typeof valueBegin === 'number' &&
            isNaN(valueFin) && isNaN(valueBegin));
    }
};

Scope.prototype.$$firstDigest = function() {
    var own  = this;
    var changeIs;
    _.forEach(this.$$myWatchers, function(watch) {
        try {
            var valueFin = watch.watchFn(own);
            var valueBegin = watch.last;
            if (!own.$$compare(valueFin, valueBegin, watch.valueComp)) {
                watch.listenerFn(valueFin, valueBegin, own);
                changeIs = true;
            }
            watch.last = (watch.valueComp ? _.cloneDeep(valueFin) : valueFin);
        } catch (e) {
            (console.error || console.log)(e);
        }
    });
    return changeIs;
};

Scope.prototype.$digest = function() {
    var ttl = 5;
    var changeIs;
    this.$beginPhase("$digest");
    do {
        while (this.$$asyncExpect.length) {
            try {
                var asyncTask = this.$$asyncExpect.shift();
                this.$eval(asyncTask.expression);
            } catch (e) {
                (console.error || console.log)(e);
            }
        }
        changeIs = this.$$firstDigest();
        if (changeIs && !(ttl--)) {
            this.$clearPhase();
            throw " Done 5 digest iterations";
        }
    } while (changeIs);
    this.$clearPhase();

    while (this.$$digestExpectAfter.length) {
        try {
            this.$$digestExpectAfter.shift()();
        } catch (e) {
            (console.error || console.log)(e);
        }
    }
};

Scope.prototype.$eval = function(expr, locals) {
    return expr(this, locals);
};

Scope.prototype.$apply = function(expr) {
    try {
        this.$beginPhase("$apply");
        return this.$eval(expr);
    } finally {
        this.$clearPhase();
        this.$digest();
    }
};

Scope.prototype.$evalAsync = function(expr) {
    var own = this;
    if (!own.$$phase && !own.$$asyncExpect.length) {
        setTimeout(function() {
            if (own.$$asyncExpect.length) {
                own.$digest();
            }
        }, 0);
    }
    own.$$asyncExpect.push({scope: own, expression: expr});
};

Scope.prototype.$$postDigest = function(fn) {
    this.$$digestExpectAfter.push(fn);
};


var scope = new Scope();
scope.someValue = "njghc";
scope.counter = 0;

var removeWatch = scope.$watch(
    function(scope) {
        return scope.someValue;
    },
    function(valueFin, valueBegin, scope) {
        scope.counter++;
    }
);

scope.$digest();
console.assert(scope.counter === 1);

scope.someValue = 'dnbvhf';
scope.$digest();
console.assert(scope.counter === 2);

removeWatch();
scope.someValue = 'jfd';
scope.$digest();
console.assert(scope.counter === 2);