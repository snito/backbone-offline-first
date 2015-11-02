'use strict';

angular.module('ngStorable', ['LocalStorageModule', 'ngBackbone'])
  .factory('StorableModel', function ($q, localStorageService, NgBackboneModel, NgBackboneCollection) {

    var StorableModel = NgBackboneModel.extend({

      initialize: function () {
        this.constructor.localInit();
      },

      localFetch: function () {
        var equivalent = this.localFindEquivalent();
        this.attributes = equivalent.attributes;
        return this;
      },

      localFindEquivalent: function () {
        var localId = this.get('localId');

        if (!localId) {
          console.error('localId is not specified');
          return this;
        };

        var equivalent = this.constructor.localFind(localId);
        return equivalent;
      },

      localIndex: function () {
        var collection = this.constructor.localCollection();
        var _this = this;
        return _.findIndex(collection.models, function (model) {
          return model.get('localId') == _this.get('localId');
        });
      },

      next: function () {
        var index = this.localIndex();
        if (index > 0) {
          var collection = this.constructor.localCollection();
          return collection.at(index - 1);
        }
      },

      prev: function () {
        var index = this.localIndex();
        var collection = this.constructor.localCollection();
        if (index < collection.length - 1) {
          return collection.at(index + 1);
        }
      },

      /**
       *
       *
       */
      saveLocal: function () {

        var deferred = $q.defer();

        var localConfig = this.constructor.localConfig;
        var columns = localConfig.columns;
        var columnNames = _.keys(columns);

        var className = localConfig.name;
        var localStorageKey = className;
        var localId = this.get('localId');

        var collection = this.constructor.localCollection();
        if (localId) {
          var equivalent = this.localFindEquivalent();
          equivalent.attributes = this.attributes;

        } else {
          this.set('localId', Math.random());
          collection.add(this);
        }

        localStorageService.set(localStorageKey, collection.toJSON());

        deferred.resolve(this);

        return deferred.promise;
      },

    }, {

      Collection: NgBackboneCollection.extend({
        model: StorableModel
      }),

      localFind: function (localId) {
        return this.localCollection().find(function (model, i) {
          return model.get('localId').toString() === localId.toString();
        });
      },

      _syncMemoryCache: function () {
        var className = this.localConfig.name;
        var localStorageKey = className;
        var attrObjs = localStorageService.get(localStorageKey);
        var attrObjs = localStorageService.get(localStorageKey);

        var _this = this;

        if (!this._memoryCollectionCache) {
          this._memoryCollectionCache = new this.Collection();
        }

        var collection = this._memoryCollectionCache;
        collection.length = 0;

        _.each(attrObjs, function (attrObj) {

          var model = collection.find(function (model) {
            return model.id && model.id == attrObj.id || model.get('localId') && model.get('localId') == attrObj.localId;
          });

          var parsedAttrs = _this.localParse(attrObj);

          if (model) {
            model.attributes = parsedAttrs;
          } else {
            model = new _this(parsedAttrs);
          }

          collection.add(model);
        });

        return collection;
      },

      localCollection: function () {

        var collection = this._syncMemoryCache();

        collection.comparator = function (model) {
          return -model.get('date').getTime();
        };
        collection.sort();

        return collection;
      },

      localParse: function (obj) {
        var keys = _.keys(obj);

        var _this = this;
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var attrNames = _.keys(_this.localConfig.columns);
          var attrName = _.find(attrNames, function (column) {
            return column === key;
          });

          if (!attrName) continue;

          if (_this.localConfig.columns[attrName] === 'DATE') {
            obj[attrName] = new Date(obj[attrName]);
            break;
          }
        }

        return obj;

      },

      localInit: function () {
        var localConfig = this.localConfig;
        var className = localConfig.name;

        if (!localStorageService.get(className)) {
          localStorageService.set(className, []);
        }
      },

    });

    return StorableModel;

  });
