/*global define*/
define(['../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/GeometryInstance',
        '../Core/PolylineGeometry',
        '../DynamicScene/ConstantProperty',
        '../Scene/Primitive',
        '../Scene/PolylineColorAppearance',
        '../Scene/Material',
        '../Scene/PolylineCollection'
       ], function(
         defaultValue,
         DeveloperError,
         defined,
         destroyObject,
         Cartesian3,
         Color,
         ColorGeometryInstanceAttribute,
         GeometryInstance,
         PolylineGeometry,
         ConstantProperty,
         Primitive,
         PolylineColorAppearance,
         Material,
         PolylineCollection) {
    "use strict";

    /**
     * A DynamicObject visualizer which maps the DynamicPolyline instance
     * in DynamicObject.polyline to a Polyline primitive.
     * @alias DynamicPolylineVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicPolyline
     * @see Scene
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see VisualizerCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensorr
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPolygonVisualizer
     * @see DynamicPyramidVisualizer
     *
     */
    var DynamicPolylineVisualizer = function(scene, dynamicObjectCollection) {
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        var polylineCollection = this._polylineCollection = new PolylineCollection();
        scene.getPrimitives().add(polylineCollection);
        this._dynamicObjectCollection = undefined;
        this._processedObject = {};
        this._geometries = [];
        this.firstTime = true;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicPolylineVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicPolylineVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicPolylineVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(DynamicPolylineVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicPolylineVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    var cachedPosition = new Cartesian3();
    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     *
     * @exception {DeveloperError} time is required.
     */
    DynamicPolylineVisualizer.prototype.update = function(time) {
        if (!defined(time)) {
            throw new DeveloperError('time is requied.');
        }
        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
                var dynamicObject = dynamicObjects[i];
                var dynamicPolyline = dynamicObject._polyline;
                if (!defined(dynamicPolyline)) {
                    continue;
                }

                var polyline;
                var showProperty = dynamicPolyline._show;
                var ellipseProperty = dynamicObject._ellipse;
                var positionProperty = dynamicObject._position;
                var vertexPositionsProperty = dynamicObject._vertexPositions;
                var polylineVisualizerIndex = dynamicObject._polylineVisualizerIndex;
                var show = dynamicObject.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));
                var property;
                var width;
                var material;
                var vertexPositions;
                var uniforms;

                if (vertexPositionsProperty instanceof ConstantProperty) {
                    if (defined(this._processedObject[dynamicObject.id])) {
                        continue;
                    }

                    if (defined(ellipseProperty)) {
                        vertexPositions = ellipseProperty.getValue(time, positionProperty.getValue(time, cachedPosition));
                    } else {
                        vertexPositions = vertexPositionsProperty.getValue(time);
                    }

                    property = dynamicPolyline._width;
                    if (defined(property)) {
                        width = property.getValue(time);
                    }

                    var color;
                    if (defined(dynamicPolyline._color)) {
                        color = dynamicPolyline._color.getValue(time);
                    }

                    // create a polyline with a material
                    var geometry = new GeometryInstance({
                        geometry : new PolylineGeometry({
                            positions : vertexPositions,
                            width : defaultValue(width, 10),
                            vertexFormat : PolylineColorAppearance.VERTEX_FORMAT
                        }),
                        attributes : {
                            color : ColorGeometryInstanceAttribute.fromColor(defaultValue(color, Color.YELLOW))
                        }
                    });
                    this._geometries.push(geometry);
                    this._processedObject[dynamicObject.id] = geometry;

                    continue;
                }

                if (!show || //
                   (!defined(vertexPositionsProperty) && //
                   (!defined(ellipseProperty) || !defined(positionProperty)))) {
                    //Remove the existing primitive if we have one
                    if (defined(polylineVisualizerIndex)) {
                        polyline = this._polylineCollection.get(polylineVisualizerIndex);
                        polyline.setShow(false);
                        dynamicObject._polylineVisualizerIndex = undefined;
                        this._unusedIndexes.push(polylineVisualizerIndex);
                    }
                    continue;
                }

                if (!defined(polylineVisualizerIndex)) {
                    var unusedIndexes = this._unusedIndexes;
                    var length = unusedIndexes.length;
                    if (length > 0) {
                        polylineVisualizerIndex = unusedIndexes.pop();
                        polyline = this._polylineCollection.get(polylineVisualizerIndex);
                    } else {
                        polylineVisualizerIndex = this._polylineCollection.getLength();
                        polyline = this._polylineCollection.add();
                    }
                    dynamicObject._polylineVisualizerIndex = polylineVisualizerIndex;
                    polyline.dynamicObject = dynamicObject;

                    // CZML_TODO Determine official defaults
                    polyline.setWidth(1);
                    material = polyline.getMaterial();
                    if (!defined(material) || (material.type !== Material.PolylineOutlineType)) {
                        material = Material.fromType(this._scene.getContext(), Material.PolylineOutlineType);
                        polyline.setMaterial(material);
                    }
                    uniforms = material.uniforms;
                    Color.clone(Color.WHITE, uniforms.color);
                    Color.clone(Color.BLACK, uniforms.outlineColor);
                    uniforms.outlineWidth = 0;
                } else {
                    polyline = this._polylineCollection.get(polylineVisualizerIndex);
                    uniforms = polyline.getMaterial().uniforms;
                }

                polyline.setShow(true);

                if (defined(ellipseProperty)) {
                    vertexPositions = ellipseProperty.getValue(time, positionProperty.getValue(time, cachedPosition));
                } else {
                    vertexPositions = vertexPositionsProperty.getValue(time);
                }

                if (defined(vertexPositions) && polyline._visualizerPositions !== vertexPositions) {
                    polyline.setPositions(vertexPositions);
                    polyline._visualizerPositions = vertexPositions;
                }

                property = dynamicPolyline._color;
                if (defined(property)) {
                    uniforms.color = property.getValue(time, uniforms.color);
                }

                property = dynamicPolyline._outlineColor;
                if (defined(property)) {
                    uniforms.outlineColor = property.getValue(time, uniforms.outlineColor);
                }

                property = dynamicPolyline._outlineWidth;
                if (defined(property)) {
                    uniforms.outlineWidth = property.getValue(time);
                }

                property = dynamicPolyline._width;
                if (defined(property)) {
                    width = property.getValue(time);
                    if (defined(width)) {
                        polyline.setWidth(width);
                    }
                }

            }
        }

        if (this.firstTime && this._geometries.length > 0) {
            this.firstTime = false;
            var primitive = new Primitive({
                geometryInstances : this._geometries,
                appearance : new PolylineColorAppearance({
                    translucent : false
                })
            });
            this._primitives.add(primitive);
            this._ga = primitive;
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    DynamicPolylineVisualizer.prototype.removeAllPrimitives = function() {
        var i;
        this._polylineCollection.removeAll();
        this.firstTime = false;

        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (i = dynamicObjects.length - 1; i > -1; i--) {
                var dynamicObject = dynamicObjects[i];
                dynamicObject._polylineVisualizerIndex = undefined;
            }
            var primitive = this._ga;
            if (defined(primitive)) {
                this._primitives.remove(primitive);
                this._processedObject = {};
                this._geometries = [];
                this.firstTime = true;
                this._ga = undefined;
            }
        }

        this._unusedIndexes = [];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicPolylineVisualizer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicPolylineVisualizer#destroy
     */
    DynamicPolylineVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof DynamicPolylineVisualizer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPolylineVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicPolylineVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        this._scene.getPrimitives().remove(this._polylineCollection);
        return destroyObject(this);
    };

    DynamicPolylineVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        var thisPolylineCollection = this._polylineCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var polylineVisualizerIndex = dynamicObject._polylineVisualizerIndex;
            if (defined(polylineVisualizerIndex)) {
                var polyline = thisPolylineCollection.get(polylineVisualizerIndex);
                polyline.setShow(false);
                thisUnusedIndexes.push(polylineVisualizerIndex);
                dynamicObject._polylineVisualizerIndex = undefined;
            }
        }
        var primitive = this._ga;
        if (defined(primitive)) {
            this._primitives.remove(primitive);
            this._processedObject = {};
            this._geometries = [];
            this.firstTime = true;
            this._ga = undefined;
        }
    };

    return DynamicPolylineVisualizer;
});
