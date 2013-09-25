/*global defineSuite*/
defineSuite([
         'Widgets/Viewer/viewerDynamicObjectMixin',
         'Core/Cartesian3',
         'DynamicScene/ConstantPositionProperty',
         'DynamicScene/ConstantProperty',
         'DynamicScene/DynamicObject',
         'Scene/CameraFlightPath',
         'Widgets/Viewer/Viewer'
     ], function(
         viewerDynamicObjectMixin,
         Cartesian3,
         ConstantPositionProperty,
         ConstantProperty,
         DynamicObject,
         CameraFlightPath,
         Viewer) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var container;
    var viewer;
    beforeEach(function() {
        container = document.createElement('span');
        container.id = 'container';
        container.style.display = 'none';
        document.body.appendChild(container);
    });

    afterEach(function() {
        if (viewer && !viewer.isDestroyed()) {
            viewer = viewer.destroy();
        }

        document.body.removeChild(container);
    });

    it('adds properties', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);
        expect(viewer.hasOwnProperty('trackedObject')).toEqual(true);
        expect(viewer.hasOwnProperty('balloonedObject')).toEqual(true);
    });

    it('can get and set trackedObject', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        viewer.trackedObject = dynamicObject;
        expect(viewer.trackedObject).toBe(dynamicObject);

        viewer.trackedObject = undefined;
        expect(viewer.trackedObject).toBeUndefined();
    });

    it('can get and set balloonedObject', function() {
        var viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3(123456, 123456, 123456));
        dynamicObject.balloon = new ConstantProperty('<span>content</span>');

        viewer.balloonedObject = dynamicObject;
        expect(viewer.balloonedObject).toBe(dynamicObject);

        viewer.balloonedObject = undefined;
        expect(viewer.balloonedObject).toBeUndefined();

        viewer.destroy();
    });

    it('home button resets tracked object', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        viewer.trackedObject = dynamicObject;
        expect(viewer.trackedObject).toBe(dynamicObject);

        //Needed to avoid actually creating a flight when we issue the home command.
        spyOn(CameraFlightPath, 'createAnimation').andReturn({
            duration : 0
        });

        viewer.homeButton.viewModel.command();
        expect(viewer.trackedObject).toBeUndefined();
    });

    it('throws with undefined viewer', function() {
        expect(function() {
            viewerDynamicObjectMixin(undefined);
        }).toThrow();
    });

    it('throws if trackedObject property already added by another mixin.', function() {
        viewer = new Viewer(container);
        viewer.trackedObject = true;
        expect(function() {
            viewer.extend(viewerDynamicObjectMixin);
        }).toThrow();
    });

    it('adds onObjectTracked event', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);
        expect(viewer.hasOwnProperty('onObjectTracked')).toEqual(true);
    });

    it('onObjectTracked is raised by trackObject', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        var spyListener = jasmine.createSpy('listener');
        viewer.onObjectTracked.addEventListener(spyListener);

        viewer.trackedObject = dynamicObject;

        waitsFor(function() {
            return spyListener.wasCalled;
        });

        runs(function() {
            expect(spyListener).toHaveBeenCalledWith(viewer, dynamicObject);

            viewer.onObjectTracked.removeEventListener(spyListener);
        });
    });
    it('throws if balloonedObject property already added by another mixin.', function() {
        var viewer = new Viewer(container);
        viewer.balloonedObject = true;
        expect(function() {
            viewer.extend(viewerDynamicObjectMixin);
        }).toThrow();
        viewer.destroy();
    });
});
