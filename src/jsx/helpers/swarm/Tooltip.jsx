import React, { useRef, useImperativeHandle, forwardRef } from 'react';

const Tooltip = forwardRef((props, ref) => {
  const tooltipRef = useRef(null);

  useImperativeHandle(ref, () => ({
    show: (event, circle, type, category) => {
      if (!tooltipRef.current) return;

      const rawValue = circle.data?.[type]?.[category];
      if (rawValue == null) return; // hide if value is null/undefined

      const value = parseFloat(rawValue).toFixed(1);

      tooltipRef.current.innerHTML = `<div>${circle.Country}: <strong>${value}%</strong></div>`;
      tooltipRef.current.style.opacity = '1';

      const wrapperRect = tooltipRef.current.parentNode.getBoundingClientRect();
      const tooltipWidth = tooltipRef.current.offsetWidth;
      const tooltipHeight = tooltipRef.current.offsetHeight;

      // Position above the circle, centered horizontally
      tooltipRef.current.style.left = `${event.clientX - wrapperRect.left - tooltipWidth / 2}px`;
      tooltipRef.current.style.top = `${event.clientY - wrapperRect.top - tooltipHeight - 10}px`;
    },
    move: (event) => {
      if (!tooltipRef.current) return;
      const wrapperRect = tooltipRef.current.parentNode.getBoundingClientRect();
      const tooltipWidth = tooltipRef.current.offsetWidth;
      const tooltipHeight = tooltipRef.current.offsetHeight;

      tooltipRef.current.style.left = `${event.clientX - wrapperRect.left - tooltipWidth / 2}px`;
      tooltipRef.current.style.top = `${event.clientY - wrapperRect.top - tooltipHeight - 10}px`;
    },
    hide: () => {
      if (!tooltipRef.current) return;
      tooltipRef.current.style.opacity = '0';
    },
  }));

  return <div ref={tooltipRef} className="swarm_tooltip" />;
});

export default Tooltip;
