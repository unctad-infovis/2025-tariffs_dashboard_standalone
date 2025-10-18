import React, {
  useEffect, useCallback, useRef, useState
} from 'react';
import PropTypes from 'prop-types';

// https://www.highcharts.com/
import Highcharts from 'highcharts';
import 'highcharts/modules/map';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/exporting';
import 'highcharts/modules/export-data';
import 'highcharts/modules/pattern-fill';

// Load map helpers.
import processTopoObjectPolygons from '../helpers/map/ProcessTopoObjectPolygons.js';
import processTopoObject from '../helpers/map/ProcessTopoObject.js';
import createMaplineSeries from '../helpers/map/CreateMaplineSeries.js';
import getColor from '../helpers/map/GetColor.js';
// import getColorAxis from '../helpers/map/GetColorAxis.js';

// https://www.npmjs.com/package/uuid4
// import { v4 as uuidv4 } from 'uuid';

function ChartMap({
  category, hover_country = null, country = null, setCountry, setHoverCountry, swarm_collapsed, type, values
}) {
  const chartMapRef = useRef(null);

  const [timer, setTimer] = useState(2 * 60); // 2 minutes in seconds

  // Function to check if any state is not default
  const isNotDefault = useCallback(() => (
    type !== 'pre'
    || category !== 'total'
    || country !== null
    || chartMapRef?.current?.mapView?.zoom > 3
    || hover_country !== null
  ), [type, category, country, hover_country]);

  useEffect(() => {
    const resetTimer = () => {
      if (isNotDefault()) setTimer(120);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [type, category, country, hover_country, isNotDefault]); // dependencies because reset depends on state

  // Countdown timer only runs if state is not default
  useEffect(() => {
    let interval;

    if (isNotDefault()) {
      interval = setInterval(() => {
        setTimer(prev => Math.max(prev - 1, 0));
      }, 1000);
    } else {
      setTimer(120); // reset timer if all defaults
    }

    // Always return cleanup function
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [type, category, country, hover_country, isNotDefault]);

  // Refresh page when timer reaches 0
  useEffect(() => {
    if (timer === 0) {
      window.location.reload();
    }
  }, [timer]);

  useEffect(() => {
    const container = document.querySelector('.map_container');
    if (!container) return;

    container.style.width = (swarm_collapsed === 'collapsed') ? 'calc(100% - 40px)' : 'calc(100% - 400px)';

    // if (chartMapRef.current?.mapNavigation) {
    //   chartMapRef.current.mapNavigation.update({
    //     buttonOptions: {
    //       x: swarm_collapsed === 'collapsed' ? 0 : 200
    //     }
    //   });
    // }
  }, [swarm_collapsed]);

  useEffect(() => {
    if (chartMapRef.current?.renderTo) {
      const hasSelection = !!country?.value;
      chartMapRef.current.series[6].data.forEach(point => {
        const newValueRaw = point.all_data?.data[type]?.[category];
        const newValue = newValueRaw != null ? parseFloat(newValueRaw) : 0;
        // Save original color once
        if (!point.original_color) {
          point.original_color = point.color || '#999';
        }
        const original = point.original_color;
        const isSelected = hasSelection && point.name === country?.value;
        // Determine color and marker
        let color = original;
        const marker = { };
        if (hasSelection) {
          if (isSelected) {
            color = Highcharts.color(original).setOpacity(1).get('rgba');
            marker.lineColor = '#eb1f48';
            marker.lineWidth = 1;
          } else {
            color = Highcharts.color(original).setOpacity(0.5).get('rgba');
            marker.lineWidth = 0;
          }
        }
        point.update({
          color,
          marker,
          visible: newValue !== 0,
          value: newValue,
          z: newValue
        }, false);
      });

      chartMapRef.current.redraw();
    }
  }, [category, country, type, values]);

  useEffect(() => {
    if (chartMapRef.current?.renderTo) {
      if (hover_country !== null) {
        const point = chartMapRef.current.series[6].data.filter(p => p.name === hover_country.label);
        if (point.length > 0) {
          chartMapRef.current.tooltip.refresh(point);
        } else {
          chartMapRef.current.tooltip.hide(50);
        }
      } else {
        chartMapRef.current.tooltip.hide(50);
      }
    }
  }, [category, hover_country, type, values]);

  const generateBubbleData = useCallback((data, coordinatesMap) => Object.entries(coordinatesMap).map(([code, coords]) => {
    const match = data.find(row => row.code === code);
    const value = match
      ? match.data[type][category] !== null
        ? parseFloat(match.data[type][category])
        : null
      : null;

    const labelen = match?.Country;
    const dev_status = match?.dev_status;

    // Assign color by development status
    let bubble_color = '#999'; // default fallback
    if (dev_status === 'Developed') bubble_color = '#004987';
    else if (dev_status === 'Developing') bubble_color = '#009edb';
    else if (dev_status === 'Least developed') bubble_color = '#fbaf17';

    return {
      all_data: match,
      code,
      color: Highcharts.color(bubble_color).setOpacity(0.7).get('rgba'),
      cursor: 'pointer',
      events: {
        click: () => {
          if (!setCountry) return;
          setCountry(prevCountry => {
            // toggle selection: deselect if same country is clicked
            if (prevCountry?.value === labelen) return null;
            return { value: labelen, label: labelen };
          });
        }
      },
      lat: coords.lat / 100000,
      lineWidth: 0,
      lon: coords.lon / 100000,
      marker: {
        lineColor: bubble_color,
        states: {
          hover: {
            enabled: false
          }
        }
      },
      name: labelen,
      value,
      z: value
    };
  }), [category, setCountry, type]);

  const createMap = useCallback((data, bubbleData, topology) => {
    // Prepare a mapping of code -> labelen, labelfr from topology
    const labelMap = topology.objects.economies.geometries.reduce((mapLabel, geometry) => {
      const { code, labelen, labelfr } = geometry.properties; // Extract properties from geometry
      mapLabel[code] = { labelen, labelfr }; // Map code to labelen and labelfr
      return mapLabel;
    }, {});
    // Manually insert European Union label
    labelMap['918'] = {
      labelen: 'European Union',
      labelfr: 'Union européenne'
    };
    const chinaAreas = ['156', '158', '344', '446'];

    const [minValue, maxValue] = data
      .map(obj => Object.values(obj.data).map(o => Object.values(o)).reduce((a, b) => a.concat(b), []))
      .reduce((a, b) => a.concat(b), [])
      .filter(v => v != null)
      .reduce(([lo, hi], v) => [Math.min(lo, v), Math.max(hi, v)], [Infinity, -Infinity]);

    Highcharts.setOptions({
      lang: {
        decimalPoint: '.',
        downloadCSV: 'Download CSV data',
        thousandsSep: ' '
      }
    });
    Highcharts.SVGRenderer.prototype.symbols.download = (x, y, w, h) => {
      const path = [
        // Arrow stem
        'M', x + w * 0.5, y,
        'L', x + w * 0.5, y + h * 0.7,
        // Arrow head
        'M', x + w * 0.3, y + h * 0.5,
        'L', x + w * 0.5, y + h * 0.7,
        'L', x + w * 0.7, y + h * 0.5,
        // Box
        'M', x, y + h * 0.9,
        'L', x, y + h,
        'L', x + w, y + h,
        'L', x + w, y + h * 0.9
      ];
      return path;
    };
    chartMapRef.current = Highcharts.mapChart('map_container', {
      caption: {
        enabled: false,
      },
      chart: {
        backgroundColor: 'transparent',
        height: 690,
        spacing: 10,
        type: 'map'
      },
      credits: {
        enabled: false
      },
      exporting: {
        buttons: {
          contextButton: {
            menuItems: ['viewFullscreen', 'separator', 'downloadPNG', 'downloadPDF', 'separator', 'downloadCSV'],
            symbol: 'download',
            symbolFill: '#000',
            y: 10
          }
        },
        enabled: false,
        filename: '2025-tariffs_dashboard_standalone'
      },
      legend: {
        enabled: false
      },
      mapNavigation: {
        buttonOptions: {
          verticalAlign: 'bottom',
          x: 10
        },
        enableButtons: true,
        enabled: false,
        buttons: {
          zoomIn: {
            y: -50
          },
          zoomOut: {
            y: -22
          }
        }
      },
      plotOptions: {
        mapline: {
          lineWidth: 0.33,
          tooltip: {
            enabled: false
          }
        },
        series: {
          point: {
            events: {
              mouseOver() {
                const element = this;
                if (element.id === 'C00003') {
                  return false;
                }
                if (chinaAreas.includes(element.id)) {
                  const { chart } = element.series;
                  chinaAreas.forEach((area) => {
                    chart.get(area)?.setState('hover');
                  });
                }
                return true;
              },
              mouseOut() {
                const element = this;
                const { chart } = element.series;
                chinaAreas.forEach((area) => {
                  chart.get(area)?.setState('');
                });
              }
            }
          }
        }
      },
      responsive: {
        rules: [{
          chartOptions: {
            title: {
              style: {
                fontSize: '26px',
                lineHeight: '30px'
              }
            },
            exporting: {
              enabled: false
            }
          },
          condition: {
            maxWidth: 500
          }
        }]
      },
      series: [
        {
          // The colored layer series.
          affectsMapView: true,
          data: processTopoObjectPolygons(topology, 'economies-color').map(region => {
            const match = data.find(row => row.code === region.properties.code);
            const value = match ? parseFloat(match.value) : null;
            const { code } = region.properties; // Store region code
            let labelen = code;
            if (labelMap[code]) {
              labelen = labelMap[code].labelen;
            }
            return {
              borderWidth: 0,
              color: getColor(value, code, data, 'value', chinaAreas),
              geometry: region.geometry,
              id: code,
              name: labelen,
              value
            };
          }),
          enableMouseTracking: false,
          name: 'economies_color',
          states: {
            hover: {
              borderColor: '#fff',
              borderWidth: 2
            },
            inactive: {
              enabled: false
            }
          },
          type: 'map',
          visible: true,
        },
        {
          // The helper layer series for tooltips.
          affectsMapView: false,
          data: processTopoObjectPolygons(topology, 'economies').map(region => ({
            borderWidth: 0,
            geometry: region.geometry
          })),
          enableMouseTracking: false,
          name: 'economies',
          states: {
            inactive: {
              enabled: false
            }
          },
          type: 'map',
          visible: false
        },
        // Using the function to create mapline series
        createMaplineSeries('dash_borders', processTopoObject(topology, 'dashed-borders'), 'Dash'),
        createMaplineSeries('dot_borders', processTopoObject(topology, 'dotted-borders'), 'Dot'),
        createMaplineSeries('dash_dot_borders', processTopoObject(topology, 'plain-borders'), 'DashDot'),
        createMaplineSeries('solid_borders', processTopoObject(topology, 'plain-borders'), 'Solid'),
        {
          animation: {
            duration: 600,
            easing: 'easeOutQuad'
          },
          cursor: 'pointer',
          data: bubbleData,
          joinBy: null,
          maxSize: '9%',
          minSize: 0,
          name: 'Average Tariff Rate',
          marker: {
            lineWidth: 0,
            fillOpacity: 1,
            states: {
              hover: {
                fillOpacity: 1,
                enabled: false
              }
            }
          },
          point: {
            events: {
              mouseOver() {
                const hovered = this;
                setHoverCountry({ label: hovered.name, value: hovered.name });
              },
              mouseOut: () => {
                setHoverCountry(null);
              }
            }
          },
          clip: false,
          type: 'mapbubble',
          visible: true,
          zMax: maxValue,
          zMin: minValue
        },
      ],
      subtitle: {
        text: null,
      },
      tooltip: {
        enabled: true,
        // headerFormat: '<span style="font-size: 15px;"><strong>{point.name}</strong></span><br /><br />',
        headerFormat: '',
        pointFormat: '{point.name}: <strong>{point.value:.1f}%</strong>',
        style: {
          color: '#000',
          fontFamily: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
          fontSize: '13px',
          fontWeight: 300,
        }
      },
      title: {
        text: null,
      }
    });
    return () => {
      if (chartMapRef.current) {
        chartMapRef.current.destroy(); // Cleanup on unmount
        chartMapRef.current = null;
      }
    };
  }, [chartMapRef, setHoverCountry]);

  useEffect(() => {
    const [topology, data] = values;

    // Extract the transformation values from the TopoJSON
    const { scale, translate } = topology.transform;

    // Extract and transform the point coordinates for 'economies-point'
    const coordinatesMap = topology.objects['economies-point'].geometries.reduce((mapCoordinates, geometry) => {
      const [x, y] = geometry.coordinates; // Original projected coordinates

      // Apply inverse transformation (reverse scaling and translation)
      const lon = x * scale[0] + translate[0];
      const lat = y * scale[1] + translate[1];

      const economyCode = geometry.properties.code;
      mapCoordinates[economyCode] = { lon, lat }; // Map code to coordinates
      return mapCoordinates;
    }, {});
    coordinatesMap['918'] = {
      lon: 69042 * scale[0] + translate[0],
      lat: 64101 * scale[1] + translate[1]
    };

    const bubbleData = generateBubbleData(data, coordinatesMap);

    if (!chartMapRef.current?.renderTo) {
      createMap(data, bubbleData, topology);
    }
  }, [createMap, generateBubbleData, values]);

  return (
    <div className="map_container">
      <div id="map_container" ref={chartMapRef} />
      <div className="caption_tooltip"><button type="button" data-tooltip-id="my-tooltip-2" data-tooltip-delay-hide={1000}>Source / Note</button></div>
    </div>
  );
}

export default ChartMap;

ChartMap.propTypes = {
  category: PropTypes.string.isRequired,
  country: PropTypes.oneOfType([
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    }),
    PropTypes.oneOf([null])
  ]),
  hover_country: PropTypes.oneOfType([
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    }),
    PropTypes.oneOf([null])
  ]),
  setCountry: PropTypes.func.isRequired,
  setHoverCountry: PropTypes.func.isRequired,
  swarm_collapsed: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  values: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array
  ])).isRequired
};
