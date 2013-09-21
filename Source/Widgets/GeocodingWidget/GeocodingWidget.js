/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../getElement',
        './GeocodingWidgetViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        getElement,
        GeocodingWidgetViewModel,
        knockout) {
    "use strict";

    /**
     * A widget for finding addresses and landmarks, and flying the camera to them.  Geocoding is
     * performed using the <a href="http://msdn.microsoft.com/en-us/library/ff701715.aspx">Bing Maps Locations API</a>.
     *
     * @alias GeocodingWidget
     * @constructor
     *
     * @param {Element|String} description.container The DOM element or ID that will contain the widget.
     * @param {Scene} description.scene The Scene instance to use.
     * @param {String} [description.url='http://dev.virtualearth.net'] The base URL of the Bing Maps API.
     * @param {String} [description.key] The Bing Maps key for your application, which can be
     *        created at <a href='https://www.bingmapsportal.com/'>https://www.bingmapsportal.com/</a>.
     *        If this parameter is not provided, {@link BingMapsApi.defaultKey} is used.
     *        If {@link BingMapsApi.defaultKey} is undefined as well, a message is
     *        written to the console reminding you that you must create and supply a Bing Maps
     *        key as soon as possible.  Please do not deploy an application that uses
     *        this widget without creating a separate key for your application.
     * @param {Ellipsoid} [description.ellipsoid=Ellipsoid.WGS84] The Scene's primary ellipsoid.
     * @param {Number} [description.flightDuration=1500] The duration of the camera flight to an entered location, in milliseconds.
     *
     * @exception {DeveloperError} description.container is required.
     * @exception {DeveloperError} description.scene is required.
     */
    var GeocodingWidget = function(description) {
        if (!defined(description) || !defined(description.container)) {
            throw new DeveloperError('description.container is required.');
        }
        if (!defined(description.scene)) {
            throw new DeveloperError('description.scene is required.');
        }

        var container = getElement(description.container);

        this._container = container;

        this._viewModel = new GeocodingWidgetViewModel(description);

        var textBox = document.createElement('input');
        textBox.className = 'cesium-geocodingWidget-input';
        textBox.setAttribute('placeholder', 'Enter an address or landmark...');
        textBox.setAttribute('data-bind', 'value: searchText, event: { keypress: inputKeypress }, valueUpdate: "afterkeydown"');
        this._textBox = textBox;
        container.appendChild(textBox);

        var goButton = document.createElement('span');
        goButton.className = 'cesium-geocodingWidget-goButton';
        goButton.setAttribute('data-bind', 'click: search');
        this._goButton = goButton;
        container.appendChild(goButton);

        knockout.applyBindings(this._viewModel, this._container);
    };

    defineProperties(GeocodingWidget.prototype, {
        /**
         * Gets the parent container.
         * @memberof GeocodingWidget.prototype
         *
         * @type {Element}
         */
        container : {
            get : function() {
                return this._container;
            }
        },

        /**
         * Gets the view model.
         * @memberof GeocodingWidget.prototype
         *
         * @type {GeocodingWidgetViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @memberof GeocodingWidget
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    GeocodingWidget.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof GeocodingWidget
     */
    GeocodingWidget.prototype.destroy = function() {
        var container = this._container;
        knockout.cleanNode(container);
        container.removeChild(this._textBox);
        container.removeChild(this._goButton);
        return destroyObject(this);
    };

    return GeocodingWidget;
});