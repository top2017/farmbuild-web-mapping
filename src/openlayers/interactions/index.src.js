'use strict';

angular.module('farmbuild.webmapping')
    .factory('interactions',
    function (validations,
              $log) {
        var _isDefined = validations.isDefined,
            _geoJSONFormat = new ol.format['GeoJSON'](),
            _select, _modify, _draw, _snap, _activeLayer, _activeLayerName,
            _mode;

        function _createSelect(layer, map) {
            var selectInteraction = new ol.interaction.Select({
                addCondition: ol.events.condition.shiftKeyOnly,
                layers: [layer]
            });

            function _init() {
                $log.info('select interaction init ...');
                map.addInteraction(selectInteraction);
                selectInteraction.setActive(false);
            }

            function _enable() {
                selectInteraction.setActive(true);
            }

            function _disable() {
                selectInteraction.setActive(false);
            }

            return {
                init: _init,
                enable: _enable,
                disable: _disable,
                interaction: selectInteraction
            }
        };

        function _createModify(select, map) {
            var modifyInteraction = new ol.interaction.Modify({
                features: select.interaction.getFeatures()
            });

            function _init() {
                $log.info('modify interaction init ...');
                map.addInteraction(modifyInteraction);
                modifyInteraction.setActive(false);
            }

            function _enable() {
                modifyInteraction.setActive(true);
            }

            function _disable() {
                modifyInteraction.setActive(false);
            }

            return {
                init: _init,
                enable: _enable,
                disable: _disable,
                interaction: modifyInteraction
            }
        };

        function _createDraw(paddocksSource, farmSource, map) {
            var drawInteraction = new ol.interaction.Draw({
                source: paddocksSource,
                type: /** @type {ol.geom.GeometryType} */ ('Polygon')
            });

            function _init() {
                $log.info('draw interaction init ...');
                map.addInteraction(drawInteraction);
                drawInteraction.setActive(false);
                drawInteraction.on('drawend', function (e) {
                    var feature = e.feature;
                    _clip(feature, paddocksSource, farmSource);
                    setTimeout(function () {
                        paddocksSource.removeFeature(feature);
                    }, 100);
                });
            }

            function _enable() {
                drawInteraction.setActive(true);
            }

            function _disable() {
                drawInteraction.setActive(false);
            }

            return {
                init: _init,
                enable: _enable,
                disable: _disable,
                interaction: drawInteraction
            }
        };

        function _createSnap(paddocksSource, map) {

            var snapInteraction = new ol.interaction.Snap({
                source: paddocksSource
            });

            function _enable() {
                snapInteraction.setActive(true);
            }

            function _disable() {
                snapInteraction.setActive(false);
            }

            function _init() {
                $log.info('snap interaction init ...');
                map.addInteraction(snapInteraction);
                snapInteraction.setActive(false);
            }

            return {
                init: _init,
                enable: _enable,
                disable: _disable,
                interaction: snapInteraction
            }
        };

        // Remove all interactions of map
        function _destroy(map) {
            $log.info('destroying all interactions ...');
            map.getInteractions().clear();
            map.addInteraction(new ol.interaction.DragPan({kinetic: null}));
        };

        function _init(map, farmLayer, paddocksLayer, activeLayerName) {

            $log.info('interactions init ...');
            if (!_isDefined(activeLayerName) || !_isDefined(map) || !_isDefined(paddocksLayer) || !_isDefined(farmLayer)) {
                return;
            }

            if(activeLayerName === 'paddocks'){
                _activeLayer = paddocksLayer;

            } else if(activeLayerName === 'farm'){
                _activeLayer = farmLayer;
            } else {
                return;
            }

            _select = _createSelect(_activeLayer, map);
            _modify = _createModify(_select, map);
            _draw = _createDraw(paddocksLayer.getSource(), farmLayer.getSource(), map);
            _snap = _createSnap(paddocksLayer.getSource(), map);
            _mode = '';
            _activeLayerName = activeLayerName;

            _select.init();
            _modify.init();
            _draw.init();
            _snap.init();

        };


        function _featureToGeoJson(feature) {
            return angular.fromJson(_geoJSONFormat.writeFeature(feature));
        };

        function _featuresToGeoJson(features) {
            return angular.fromJson(_geoJSONFormat.writeFeatures(features));
        };

        function _addGeoJsonFeature(layer, feature) {
            layer.getSource().addFeature(new ol.Feature({
                geometry: new ol.geom[feature.geometry.type](feature.geometry.coordinates)
            }));
            _select.interaction.getFeatures().clear();
        };

        function _merge(features) {
            $log.info('merging features ...', features);
            var toMerge;
            toMerge = _featuresToGeoJson(features);
            _addGeoJsonFeature(_activeLayer, turf.merge(toMerge));
        };

        function _erase(feature, features){
            features.forEach(function (layerFeature) {
                var clipper = _featureToGeoJson(layerFeature);
                feature = turf.erase(feature, clipper);
            });
            return feature;
        }

        function _inverseErase(feature, features){
            features.forEach(function (layerFeature) {
                var clipper = _featureToGeoJson(layerFeature);
                feature = turf.erase(clipper, feature);
                feature = turf.erase(clipper, feature);
            });
            return feature;
        };

        function _clip(feature, paddockSource, farmSource) {
            $log.info('clipping feature ...', feature);
            var featureToClip = _featureToGeoJson(feature),
                paddocksFeatures = paddockSource.getFeatures(),
                farmFeatures = farmSource.getFeatures(), clipped;

            if(_activeLayerName === 'paddocks') {
                clipped = _erase(featureToClip, paddocksFeatures);
                clipped = _inverseErase(clipped, farmFeatures);
            }

            if(_activeLayerName === 'farm'){
                clipped = _erase(featureToClip, farmFeatures);
            }

            _addGeoJsonFeature(_activeLayer, clipped);

        };

        function _area(features) {
            $log.info('calculating area of features ...', features);
            var geoJsonFeatures = _featuresToGeoJson(features);
            return turf.area(geoJsonFeatures) * 0.0001;
        };

        function _remove(features) {
            $log.info('removing features ...', features);
            if (_isDefined(features) || _isDefined(featuresLayer)) {
                features.forEach(function (feature) {
                    _activeLayer.getSource().removeFeature(feature);
                });
            }
            _select.getFeatures().clear();
        };

        function _selected() {
            $log.info('Selected features ...');
            return _select.interaction.getFeatures();
        };

        function _enableEditing() {
            if(_mode === 'edit'){
                return;
            }
            $log.info('editing enabled');
            _select.enable();
            _modify.enable();
            _snap.enable();
            _draw.disable();
            _mode = 'edit';
        };

        function _enableDrawing() {
            if(_mode === 'draw'){
                return;
            }
            $log.info('drawing enabled');
            _select.interaction.getFeatures().clear();
            _select.disable();
            _modify.disable();
            _draw.enable();
            _snap.enable();
            _mode = 'draw';
        };

        return {
            init: _init,
            destroy: _destroy,
            enableDrawing: _enableDrawing,
            enableEditing: _enableEditing,
            merge: _merge,
            remove: _remove,
            clip: _clip,
            area: _area,
            selected: _selected
        }

    });