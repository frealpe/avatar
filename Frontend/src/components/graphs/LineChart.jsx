import React, { useRef, useEffect, useCallback } from 'react';
import embed from 'vega-embed';

/**
 * LineChart — HOC-friendly, real-time, Vega-Lite line chart.
 *
 * Props:
 *   series   Array<{ key: string, label: string, color: string, values: number[] }>
 *            Each entry is one line in the chart. `values` is a rolling buffer.
 *   height   number (default 180)
 *   light    boolean (default true) — theme
 *   title    string (optional)
 */
const LineChart = ({ series = [], height = 180, light = true, title }) => {
    const containerRef = useRef(null);
    const viewRef = useRef(null);

    const buildSpec = useCallback(() => ({
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: 'container',
        height,
        autosize: { type: 'fit', contains: 'padding' },
        background: 'transparent',
        config: {
            axis: {
                labelColor: light ? '#475569' : '#94a3b8',
                titleColor: light ? '#475569' : '#94a3b8',
                gridColor: light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                domainColor: light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
            },
            view: { stroke: 'transparent' },
            legend: { disable: true },
        },
        ...(title ? { title: { text: title, color: light ? '#1e293b' : '#e2e8f0', fontSize: 11, fontWeight: 600 } } : {}),
        data: { name: 'table' },
        mark: { type: 'line', interpolate: 'monotone', strokeWidth: 2, point: false },
        encoding: {
            x: {
                field: 't', type: 'quantitative',
                title: null,
                axis: { labels: false, ticks: false, grid: false },
            },
            y: {
                field: 'val', type: 'quantitative',
                title: null,
                scale: {
                    zero: false,
                    nice: true,
                    domain: { data: 'table', field: 'val' },
                },
            },
            color: {
                field: 'key', type: 'nominal',
                scale: {
                    domain: series.map(s => s.key),
                    range: series.map(s => s.color),
                },
                legend: null,
            },
            strokeWidth: { value: 2 },
        },
    }), [height, light, title, series]);

    // Build the flat table from series
    const buildTable = useCallback(() => {
        const rows = [];
        series.forEach(({ key, values }) => {
            (values || []).forEach((val, t) => {
                rows.push({ t, val, key });
            });
        });
        return rows;
    }, [series]);

    // Initial mount: embed the spec
    useEffect(() => {
        if (!containerRef.current) return;
        const spec = buildSpec(); // spec already has data: { name: 'table' }

        embed(containerRef.current, spec, {
            renderer: 'canvas',
            actions: false,
        }).then(result => {
            viewRef.current = result.view;
            // Load initial rows into the named dataset
            const initialRows = buildTable();
            if (initialRows.length > 0) {
                result.view.data('table', initialRows).run();
            }
        });

        return () => {
            if (viewRef.current) {
                viewRef.current.finalize();
                viewRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // only on mount

    // Live updates: use changeset to push new rows efficiently
    useEffect(() => {
        if (!viewRef.current) return;

        const table = buildTable();
        viewRef.current
            .data('table', table)
            .run();
    }, [buildTable]);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: `${height + 16}px` }}
        />
    );
};

export default LineChart;
