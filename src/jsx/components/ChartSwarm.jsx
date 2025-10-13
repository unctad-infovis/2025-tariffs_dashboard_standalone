import React, {
  useRef, useState, useEffect, useMemo
} from 'react';
import PropTypes from 'prop-types';
import {
  scaleLinear, forceSimulation, forceX, /* forceY, */ forceCollide
} from 'd3';
import Highcharts from 'highcharts';
import { v4 as uuidv4 } from 'uuid';

import Axis from '../helpers/swarm/Axis.jsx';
import Tooltip from '../helpers/swarm/Tooltip.jsx';

function ChartSwarm({
  category, hover_country = null, country = null, setHoverCountry, setCountry, swarm_collapsed, type, values
}) {
  const chartSwarmRef = useRef(null);

  const tooltipRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [nodes, setNodes] = useState([]);

  // Measure container size
  useEffect(() => {
    const updateSize = () => {
      if (chartSwarmRef.current) {
        setContainerSize({
          height: chartSwarmRef.current.offsetHeight,
          width: chartSwarmRef.current.offsetWidth
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [swarm_collapsed]);

  useEffect(() => {
    if (!hover_country || !nodes.length) {
      tooltipRef.current?.hide();
    } else {
      const circle = nodes.find(p => p.Country === hover_country.label);
      if (!circle) return;

      const svg = chartSwarmRef.current.querySelector('svg');
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const eventLike = {
        clientX: rect.left + circle.x,
        clientY: rect.top + circle.y,
      };

      tooltipRef.current?.show(eventLike, circle, type, category);
    }
  }, [hover_country, nodes, type, category]);

  const yScale = useMemo(
    () => scaleLinear()
      .domain([-2, 54])
      .range([containerSize.height - 10, 20])
      .clamp(true),
    [containerSize.height]
  );

  // Compute nodes
  useEffect(() => {
    if (!values?.[1] || containerSize.width === 0 || !yScale) return;

    const centerX = containerSize.width / 2; // offset for axis
    const swarmData = values[1];

    const initialNodes = swarmData.filter(d => d.data[type][category] !== null).map(d => {
      let bubbleColor = '#999';
      if (d.dev_status === 'Developed') bubbleColor = '#004987';
      else if (d.dev_status === 'Developing') bubbleColor = '#009edb';
      else if (d.dev_status === 'Least developed') bubbleColor = '#fbaf17';

      const isSelected = country?.value === d.Country;
      const hasSelection = !!country?.value;
      const fillColor = isSelected
        ? bubbleColor
        : hasSelection
          ? Highcharts.color(bubbleColor).setOpacity(0.65).get('rgba')
          : bubbleColor;
      const fillOpacity = isSelected ? 1 : hasSelection ? 0.65 : 1;

      // Define stroke for selected
      const strokeColor = isSelected ? '#eb1f48' : 'none';
      const strokeWidth = isSelected ? 1 : 0;
      const radius = isSelected ? 8 : (containerSize.width > 500) ? 5.5 : 4.5;

      return {
        ...d,
        fillColor,
        fillOpacity,
        id: d?.ISO3 || uuidv4(),
        r: radius,
        strokeColor,
        strokeWidth,
        // x: centerX + (Math.random() - 0.5) * 200,
        x: centerX,
        y: yScale(parseFloat(d.data[type][category]) || 0)
      };
    });

    // Create simulation
    const simulation = forceSimulation(initialNodes)
      .force('forceX', forceX(centerX).strength((swarm_collapsed === 'full') ? 0.01 : 0.02))
      // .force('forceY', forceY(d => yScale(parseFloat(d.data[type][category]) || 0)).strength((swarm_collapsed === 'full') ? 9 : 1.5))
      .force('collide', forceCollide(d => (d.r * ((swarm_collapsed === 'full') ? 1.4 : 1.2))))
      .force('lockY', () => {
        initialNodes.forEach(node => {
          node.y = yScale(parseFloat(node.data[type][category]) || 0);
        });
      })
      .stop();

    // Run simulation steps
    for (let i = 0; i < 200; i++) simulation.tick();

    setNodes(initialNodes);
  }, [values, containerSize, category, type, country, swarm_collapsed, yScale]);

  return (
    <div ref={chartSwarmRef} className="swarm_container">
      <Tooltip ref={tooltipRef} />
      <svg width={containerSize.width} height={containerSize.height}>
        {nodes.map(circle => (
          <g key={circle.id}>
            <circle
              cx={circle.x}
              cy={circle.y}
              r={circle.r}
              fill={circle.fillColor}
              fillOpacity={circle.fillOpacity}
              onClick={() => {
                if (!setCountry) return;
                const labelen = circle.Country;
                setCountry(prev => (prev?.value === labelen ? null : { value: labelen, label: labelen }));
              }}
              onMouseEnter={(e) => {
                setHoverCountry({ value: circle.ISO3, label: circle.Country });
                tooltipRef.current?.show(e, circle, type, category);
              }}
              onMouseLeave={() => {
                setHoverCountry(null);
                tooltipRef.current?.hide();
              }}
              stroke={circle.strokeColor}
              strokeWidth={circle.strokeWidth}
              style={{
                cursor: 'pointer',
                transition: 'cx 0.6s, cy 0.6s, fill 0.6s, fill-opacity 0.6s, stroke 0.6s, stroke-width 0.6s',
              }}
            />
          </g>
        ))}
        <Axis scale={yScale} width={containerSize.width} />
      </svg>
    </div>
  );
}

ChartSwarm.propTypes = {
  category: PropTypes.string.isRequired,
  country: PropTypes.oneOfType([
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired }),
    PropTypes.oneOf([null]),
  ]),
  hover_country: PropTypes.oneOfType([
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired }),
    PropTypes.oneOf([null]),
  ]),
  setCountry: PropTypes.func.isRequired,
  setHoverCountry: PropTypes.func.isRequired,
  swarm_collapsed: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  values: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.array])).isRequired,
};

export default ChartSwarm;
