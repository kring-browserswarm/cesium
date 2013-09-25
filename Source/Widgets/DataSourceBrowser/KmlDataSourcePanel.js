/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../DynamicScene/KmlDataSource',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when'
    ], function(
        createGuid,
        defined,
        defineProperties,
        KmlDataSource,
        knockout,
        when) {
    "use strict";

    var KmlDataSourcePanelViewModel = function() {
        this.url = '';

        knockout.track(this, ['url']);
    };

    KmlDataSourcePanelViewModel.prototype.reset = function() {
        this.url = '';
    };

    var KmlDataSourcePanel = function() {
        this._viewModel = new KmlDataSourcePanelViewModel();
        this._templateID = undefined;
    };

    KmlDataSourcePanel.prototype._createTemplate = function() {
        this._templateID = 'cesium-dataSourceBrowser-KmlDataSourcePanel-template-' + createGuid();
        var templateElement = document.createElement('script');
        templateElement.type = 'text/html';
        templateElement.id = this._templateID;
        templateElement.textContent = '<div>\
<span>Kml URL:</span>\
<input type="text" data-bind="value: url" size="50">\
</div>';
        document.body.appendChild(templateElement);
    };

    defineProperties(KmlDataSourcePanel.prototype, {
        /**
         * Gets the description for this panel.
         * @memberof KmlDataSourcePanel.prototype
         *
         * @type {String}
         */
        description : {
            value : 'KML/KMZ file',
            writable : false
        },

        /**
         * Gets the ID of this panel's template.
         * @memberof KmlDataSourcePanel.prototype
         *
         * @type {String}
         */
        templateID : {
            get : function() {
                if (!defined(this._templateID)) {
                    this._createTemplate();
                }
                return this._templateID;
            }
        },

        /**
         * Gets the view model for this panel.
         * @memberof KmlDataSourcePanel.prototype
         *
         * @type {Object}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    KmlDataSourcePanel.prototype.finish = function(dataSourceCollection) {
        var url = this._viewModel.url;
        if (url === '') {
            return false;
        }

        var dataSource = new KmlDataSource();
        return when(dataSource.loadUrl(url), function() {
            dataSourceCollection.add(dataSource);
            return true;
        }, function(error) {
            return when.reject(error);
        });
    };

    return KmlDataSourcePanel;
});