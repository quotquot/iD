import _debounce from 'lodash-es/debounce';

import { select as d3_select } from 'd3-selection';

import {
    modeAddNote,
    modeBrowse
} from '../modes';

import { svgIcon } from '../svg';
import { tooltip } from '../util/tooltip';
import { uiTooltipHtml } from './tooltipHtml';

export function uiNotes(context) {

    var mode = modeAddNote(context);

    function enabled() {
        return notesEnabled() && notesEditable();
    }

    function notesEnabled() {
        var noteLayer = context.layers().layer('notes');
        return noteLayer && noteLayer.enabled();
    }

    function notesEditable() {
        var mode = context.mode();
        return context.map().notesEditable() && mode && mode.id !== 'save';
    }


    return function(selection) {
        context
            .on('enter.editor.notes', function(entered) {
                selection.selectAll('button.add-button')
                    .classed('active', function(mode) { return entered.button === mode.button; });
                context.container()
                    .classed('mode-' + entered.id, true);
            });

        context
            .on('exit.editor.notes', function(exited) {
                context.container()
                    .classed('mode-' + exited.id, false);
            });

        context.keybinding().on(mode.key, function() {
            if (!enabled(mode)) return;

            if (mode.id === context.mode().id) {
                context.enter(modeBrowse(context));
            } else {
                context.enter(mode);
            }
        });


        var debouncedUpdate = _debounce(update, 500, { leading: true, trailing: true });

        context.map()
            .on('move.notes', debouncedUpdate)
            .on('drawn.notes', debouncedUpdate);

        context
            .on('enter.notes', update);

        update();


        function update() {
            var showNotes = notesEnabled();
            var data = showNotes ? [mode] : [];

            var buttons = selection.selectAll('button.add-button')
                .data(data, function(d) { return d.id; });

            // exit
            buttons.exit()
                .remove();

            // enter
            var buttonsEnter = buttons.enter()
                .append('button')
                .attr('tabindex', -1)
                .attr('class', function(d) { return d.id + ' add-button bar-button'; })
                .on('click.notes', function(d) {
                    if (!enabled(d)) return;

                    // When drawing, ignore accidental clicks on mode buttons - #4042
                    var currMode = context.mode().id;
                    if (/^draw/.test(currMode)) return;

                    if (d.id === currMode) {
                        context.enter(modeBrowse(context));
                    } else {
                        context.enter(d);
                    }
                })
                .call(tooltip()
                    .placement('bottom')
                    .html(true)
                    .title(function(d) { return uiTooltipHtml(d.description, d.key); })
                );

            buttonsEnter
                .each(function(d) {
                    d3_select(this)
                        .call(svgIcon(d.icon || '#iD-icon-' + d.button));
                });

            buttonsEnter
                .append('span')
                .attr('class', 'label')
                .text(function(mode) { return mode.title; });

            // if we are adding/removing the buttons, check if toolbar has overflowed
            if (buttons.enter().size() || buttons.exit().size()) {
                context.ui().checkOverflow('#bar', true);
            }

            // update
            buttons = buttons
                .merge(buttonsEnter)
                .classed('disabled', function(d) { return !enabled(d); });
        }
    };
}
