import React, { useEffect, useRef, useState } from 'react';
import { AgentRole, AgentStatus } from '@ai-agent/core-sdk';
import * as d3 from 'd3';

export interface AgentNode {
    id: string;
    role: AgentRole;
    status: AgentStatus;
    lastSeen: number;
}

export interface AgentLink {
    source: string;
    target: string;
    type: string;
}

export interface AgentGraphProps {
    nodes: AgentNode[];
    links: AgentLink[];
    width?: number;
    height?: number;
    onNodeClick?: (node: AgentNode) => void;
    onNodeHover?: (node: AgentNode | null) => void;
    className?: string;
    style?: React.CSSProperties;
}

export const BaseAgentGraph: React.FC<AgentGraphProps> = ({
    nodes,
    links,
    width = 800,
    height = 600,
    onNodeClick,
    onNodeHover,
    className,
    style
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [simulation, setSimulation] = useState<d3.Simulation<AgentNode, AgentLink> | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        // Clear previous simulation
        if (simulation) {
            simulation.stop();
        }

        // Create new simulation
        const newSimulation = d3.forceSimulation<AgentNode>(nodes)
            .force('link', d3.forceLink<AgentNode, AgentLink>(links).id(d => d.id))
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
                .attr('x1', d => (d.source as any).x)
                .attr('y1', d => (d.source as any).y)
                .attr('x2', d => (d.target as any).x)
                .attr('y2', d => (d.target as any).y);

            node
                .attr('cx', d => d.x!)
                .attr('cy', d => d.y!);
        });

        return () => {
            newSimulation.stop();
        };
    }, [nodes, links, width, height, onNodeClick, onNodeHover]);

    return (
        <svg
            ref={svgRef}
            width={width}
            height={height}
            className={className}
            style={style}
        />
    );
};

// Helper functions
const getNodeColor = (status: AgentStatus): string => {
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

const drag = (simulation: d3.Simulation<AgentNode, AgentLink>) => {
    const dragstarted = (event: any, d: any) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    };

    const dragged = (event: any, d: any) => {
        d.fx = event.x;
        d.fy = event.y;
    };

    const dragended = (event: any, d: any) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    };

    return d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
}; 