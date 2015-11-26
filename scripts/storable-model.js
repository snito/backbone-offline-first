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
        var equivalentAttributes = this.localFindRawEquivalent();
        if (equivalentAttributes) {
          return this.constructor.createModelInsurance(equivalentAttributes);
        }
      },

      localFindRawEquivalent: function () {
        var _this = this;
        var thisAttributes = this.attributes;
        var attributesTobeSaved = _.find(this.constructor.attributesList, function (attributes, i) {
          return (attributes.objectId && attributes.objectId == _this.id) || (attributes.localId && attributes.localId == thisAttributes.localId);
        });
        return attributesTobeSaved;
      },

      localIndex: function () {
        return this.constructor.attributesList.indexOf(this.localFindRawEquivalent());
      },

      next: function () {
        var index = this.localIndex();
        console.log(index);
        if (index > 0) {
          var attributes = this.constructor.attributesList[index - 1];
          return this.constructor.createModelInsurance(attributes);
        }
      },

      prev: function () {
        var index = this.localIndex();
        if (index < this.constructor.attributesList - 1) {
          return this.constructor.createModelInsurance(attributes);
        }
      },

      /**
       *
       *
       */
      saveLocal: function (attributes) {
        if (_.isObject(attributes)) this.set(attributes);
        this._saveLocal();
        return this.constructor.write();
      },

      _saveLocal: function () {

        // var attributes = angular.copy(this.attributes);

        var equivalent = this.localFindEquivalent();

        if (equivalent) {

          // TODO
          // angular.extend(equivalent.attributes, attributes);
        } else {
          this.set('localId', Math.random().toString());
          this.constructor.attributesList.push(this.attributesForLocal());
        }

      },

      attributesForLocal: function () {
        var obj = angular.extend({}, this.toJSON(), {
          objectId: this.id
        });
        delete obj.ACL;
        return obj;

      },

      afterRetrieve: function () {

      },

    }, {

      Collection: NgBackboneCollection.extend({
        model: StorableModel
      }),

      collectionFromAttributesList: function (attributesList) {

        var _attributesList = attributesList || this.attributesList;

        var collection = new this.Collection();
        var _this = this;
        _.each(_attributesList, function (attributes, i) {

          var model = _this.createModelInsurance(angular.copy(attributes));
          collection.add(model);
        });

        return collection;
      },

      syncToLocal: function () {
        var deferred = $q.defer();
        deferred.resolve();
        return deferred.promise;
      },

      localFind: function (localId) {
        console.log('localId', localId, this.attributesList);
        var attributes = _.find(this.attributesList, function (attributes, i) {

          console.log(i, attributes);
          return attributes.localId === localId;
        });
        return this.createModelInsurance(attributes);
      },

      localFindById: function (id) {
        var attributes = _.find(this.attributesList, function (attributes, i) {
          return attributes.objectId === id;
        });
        return this.createModelInsurance(attributes);
      },

      /**
       * Save localCollection to localStorage
       *
       */
      write: function () {
        var deferred = $q.defer();

        var localConfig = this.localConfig;
        var className = localConfig.name;
        var localStorageKey = className;

        var newAttributesList = [];

        _.each(this.attributesList, function (model, i) {
          newAttributesList.push(model);
        });
        localStorageService.set(localStorageKey, newAttributesList);

        deferred.resolve();
        return deferred.promise;
      },

      /**
       * Get localCollection from localStorage.
       *
       * @returns {Promise}
       */
      read: function () {
        console.time('read');

        var start = new Date().getTime();
        var deferred = $q.defer();

        var localConfig = this.localConfig;
        var className = localConfig.name;
        var localStorageKey = className;

        var attributesList = this.attributesList = localStorageService.get(localStorageKey);

        this.afterRead();
        console.log('read:' + (new Date().getTime() - start));
        console.timeEnd('read');

        deferred.resolve(attributesList);

        return deferred.promise;
      },

      afterRead: function () {

      },

      /**
       * This method is called after retrieved from cached
       *
       * @returns {Object}
       */
      createModelInsurance: function (attributes) {
        attributes = angular.copy(attributes) || {};
        if (attributes.date) {
          attributes.date = new Date(attributes.date);
        }

        var model = new this(attributes);
        model.afterRetrieve();
        return model;
      },

      localInit: function () {

        var localConfig = this.localConfig;
        var className = localConfig.name;

        if (this.initialized) {
          return;
        }

        if (!localStorageService.get(className)) {
          localStorageService.set(className, []);
        }

        if (!this.attributesList) {
          this.attributesList = [];
        }

        this.initialized = true;

        this.read();
      },

    });

    return StorableModel;

  });
