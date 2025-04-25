import React, { useEffect, useRef, useState } from 'react';
import { AgentStatus } from '@ai-agent/core-sdk';
import * as d3 from 'd3';
export const BaseAgentGraph = ({ nodes, links, width = 800, height = 600, onNodeClick, onNodeHover, className, style }) => {
    const svgRef = useRef(null);
    const [simulation, setSimulation] = useState(null);
    useEffect(() => {
        if (!svgRef.current)
            return;
        // Clear previous simulation
        if (simulation) {
            simulation.stop();
        }
        // Create new simulation
        const newSimulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id))
            .force('charge', d3.forceManyBody().strength(-150))
            .force('center', d3.forceCenter(width / 2, height / 2));
        setSimulation(newSimulation);
        // Create SVG elements
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        const link = svg.append('g')
            .selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6);
        const node = svg.append('g')
            .selectAll('circle')
            .data(nodes)
            .enter()
            .append('circle')
            .attr('r', 10)
            .attr('fill', d => getNodeColor(d.status))
            .call(drag(newSimulation));
        // Add event handlers
        if (onNodeClick) {
            node.on('click', (event, d) => onNodeClick(d));
        }
        if (onNodeHover) {
            node.on('mouseenter', (event, d) => onNodeHover(d))
                .on('mouseleave', () => onNodeHover(null));
        }
        // Update positions on each tick
        newSimulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
        });
        return () => {
            newSimulation.stop();
        };
    }, [nodes, links, width, height, onNodeClick, onNodeHover]);
    return (<svg ref={svgRef} width={width} height={height} className={className} style={style}/>);
};
// Helper functions
const getNodeColor = (status) => {
    switch (status) {
        case AgentStatus.Active:
            return '#4CAF50';
        case AgentStatus.Offline:
            return '#9E9E9E';
        case AgentStatus.Error:
            return '#F44336';
        default:
            return '#2196F3';
    }
};
const drag = (simulation) => {
    const dragstarted = (event, d) => {
        if (!event.active)
            simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    };
    const dragged = (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
    };
    const dragended = (event, d) => {
        if (!event.active)
            simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    };
    return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
};
//# sourceMappingURL=AgentGraph.js.map