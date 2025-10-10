import React, { useRef, useEffect } from 'react';
import { select } from 'd3-selection';
import { axisRight } from 'd3-axis';
import PropTypes from 'prop-types';

function Axis({ scale = null, width = 0 }) {
  const axisRef = useRef(null);

  useEffect(() => {
    if (axisRef.current && scale) {
      const axis = axisRight(scale)
        .tickValues([0, 10, 20, 30, 40, 50]) // only show 10,20,30,40,50
        .tickFormat(d => `${d}%`) // append %
        .tickSize(0); // no default short ticks

      const g = select(axisRef.current);
      g.call(axis);

      // Remove vertical domain line
      g.select('.domain').remove();

      // Style all grid lines
      g.selectAll('.tick line')
        .attr('x2', -width + 40) // draw grid lines to the left
        .attr('stroke-dasharray', '2,2')
        .attr('stroke', '#AEA29A')
        .attr('stroke-width', 0.5);

      // Style labels
      g.selectAll('.tick text')
        .attr('x', -25)
        .attr('dy', '-0.30em')
        .attr('text-anchor', 'start')
        .style('fill', '#7c7067')
        .style('font-size', '12px');

      // 🔹 Make the 0% line solid and thicker
      g.selectAll('.tick')
        .filter(d => d === 0)
        .select('line')
        .attr('stroke', '#777')
        .attr('stroke-dasharray', 'none')
        .attr('stroke-width', 1.2);
    }
  }, [scale, width]);

  return <g ref={axisRef} transform={`translate(${width - 20}, 0)`} />;
}

Axis.propTypes = {
  scale: PropTypes.func,
  width: PropTypes.number
};

export default Axis;
