/**
 * @since 0.0.1
 * @copyright 2015 Spatial Vision, Inc. http://spatialvision.com.au
 * @license The MIT License
 * @author Spatial Vision
 * @version 0.1.0
 */

'use strict';

/**
 * webmapping
 * @module webmapping
 */
angular.module('farmbuild.webmapping')
    .factory('googleaddresssearch',
    function (validations,
              $log,
              openLayers, googlemapslayer) {
        var countryRestrict = {'country': 'au'};

        function _init(targetElementId) {
            // Create the autocomplete object and associate it with the UI input control.
            // Restrict the search to the default country, and to place type "cities".
            var autocomplete = new google.maps.places.Autocomplete(
                /** @type {HTMLInputElement} */(document.getElementById(targetElementId)),
                {
                    //types: ['(cities)'],
                    componentRestrictions: countryRestrict
                });

            google.maps.event.addListener(autocomplete, 'place_changed', function () {
                _onPlaceChanged(autocomplete)
            });
        };


        // When the user selects a city, get the place details for the city and
        // zoom the map in on the city.
        function _onPlaceChanged(autocomplete) {
            var place = autocomplete.getPlace(), latLng;
            if (!place.geometry) {
                return;
            }

            latLng = place.geometry.location;
            _center(latLng);
        };

        function _transform(latLng, sourceProjection, destinationProjection) {
            return ol.proj.transform([latLng.lng(), latLng.lat()], sourceProjection, destinationProjection);
        };


        function _center(latLng) {
            var googleMapProjection = googlemapslayer.getProjection(),
                openLayerProjection = openLayers.getProjection(),
                centerPoint = _transform(latLng, openLayerProjection, googleMapProjection);
            openLayers.center(centerPoint);
        };

        return {
            init: _init
        }
    });