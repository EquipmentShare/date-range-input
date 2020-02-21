var DateRangeInputTestApp = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            $$.fragment && $$.fragment.p($$.ctx, $$.dirty);
            $$.dirty = [-1];
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    let monthNames = null;
    const getMonthNames = () => {
    	if (!monthNames) {
    		const formatter = new Intl.DateTimeFormat(undefined, {
    			month: `long`,
    		});

    		const zeroThroughEleven = new Array(12).fill(null).map((_, i) => i);

    		monthNames = zeroThroughEleven.map(jsDateMonthNumber => formatter.format(new Date(2020, jsDateMonthNumber)));
    	}

    	return monthNames
    };

    var getMonthName = monthNumber => {
    	if (monthNumber < 1 || monthNumber > 12) {
    		throw new Error(`getMonthName argument must be between 1 and 12 – you passed in ${monthNumber}`)
    	}

    	return getMonthNames()[monthNumber - 1]
    };

    const anArbitrarySundayEarlyInTheMonth = new Date(2020, 0, 5);
    const dayNumbers = [ 0, 1, 2, 3, 4, 5, 6 ];

    let daysOfWeek = null;

    var getDaysOfTheWeek = () => {
    	if (!daysOfWeek) {
    		const formatter = new Intl.DateTimeFormat(undefined, {
    			weekday: `short`,
    		});

    		daysOfWeek = dayNumbers.map(dayNumber => {
    			const date = new Date(anArbitrarySundayEarlyInTheMonth);
    			date.setDate(date.getDate() + dayNumber);
    			return formatter.format(date)
    		});
    	}

    	return daysOfWeek
    };

    function calendarize (target, offset) {
    	var i=0, j=0, week, out=[], date = new Date(target || new Date);
    	var year = date.getFullYear(), month = date.getMonth();

    	// day index (of week) for 1st of month
    	var first = new Date(year, month, 1 - (offset | 0)).getDay();

    	// how many days there are in this month
    	var days = new Date(year, month+1, 0).getDate();

    	while (i < days) {
    		for (j=0, week=new Array(7); j < 7;) {
    			while (j < first) week[j++] = 0;
    			week[j++] = ++i > days ? 0 : i;
    			first = 0;
    		}
    		out.push(week);
    	}

    	return out;
    }

    const datesMatch = (a, b) => a.year === b.year
    	&& a.month === b.month
    	&& a.day === b.day;

    const dateGt = (a, b) => {
    	if (a.year === b.year && a.month === b.month) {
    		return a.day > b.day
    	} else if (a.year === b.year) {
    		return a.month > b.month
    	} else {
    		return a.year > b.year
    	}
    };

    const dateGte = (a, b) => dateGt(a, b) || datesMatch(a, b);

    const dateLt = (a, b) => !dateGte(a, b);

    const dateLte = (a, b) => dateLt(a, b) || datesMatch(a, b);

    function eventIsModifiedByKeyPress(event) {
    	return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
    }
    function isLeftClick(event){
    	return event.button === 0
    }

    var clickShouldBeInterceptedForNavigation = function shouldIntercept(event) {
    	return !event.defaultPrevented
    		&& !eventIsModifiedByKeyPress(event)
    		&& isLeftClick(event)
    };

    /* src/Month.svelte generated by Svelte v3.16.4 */
    const file = "src/Month.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-x4itxh-style";
    	style.textContent = ":root,.svelte-x4itxh:host{--size-quarter:.25rem;--size-half:.50rem;--size-base:1rem;--size-double:2rem;--border-width:1px;--border-radius:var(--size-quarter);--size-default-spacing:var(--size-half);--control-height:2.25rem}:root,.svelte-x4itxh:host{--text-font-size-small:calc(var(--size-base) * .75);--text-font-size-base:var(--size-base);--text-font-family:Roboto, sans-serif;--text-font-weight-base:400;--text-font-weight-bold:700}:root,.svelte-x4itxh:host{--color-brand-primary:#616161;--color-brand-secondary:#424242;--color-ui-primary:#00adee;--color-ui-es-orange:#f6911e;--color-theme-default:#616161;--color-theme-white:#ffffff;--color-theme-offwhite:#fafafa;--color-theme-gray:#9e9e9e;--color-theme-gray-lighter:#bdbdbd;--color-theme-gray-lightest:#d0d0d0;--color-theme-charcoal:#232323;--color-theme-black:#000000;--color-theme-mute:#e0e0e0;--color-theme-green:#63a83c;--color-theme-red:#dd1a22;--color-theme-purple:#7e4ceb;--color-theme-orange:#f6911e;--section-container-background-color:var(--color-theme-offwhite)}.svelte-x4itxh{box-sizing:border-box}.svelte-x4itxh:host{font-size:16px;font-weight:400}.svelte-x4itxh:host{font-family:var(--text-font-family);font-size:var(--text-font-size-base)}.container.svelte-x4itxh{--day-width:calc(var(--size-base) * 1.75);--month-width:calc(var(--day-width) * 7);font-family:var(--text-font-family);color:var(--color-theme-charcoal);box-sizing:border-box;flex-direction:column}.full-width.svelte-x4itxh{width:var(--month-width);display:flex}.month-row.svelte-x4itxh{justify-content:space-between;align-items:center;padding-bottom:var(--size-quarter)}.weekday-names.svelte-x4itxh{font-size:var(--size-half);text-align:center;padding:var(--size-quarter) 0;color:var(--color-theme-default)}.weekday-name.svelte-x4itxh{flex-grow:1}.weeks.svelte-x4itxh{display:flex;flex-direction:column;align-items:stretch}.week.svelte-x4itxh{display:flex;text-align:center;font-size:calc(var(--size-base) * .75)}.day.svelte-x4itxh{width:var(--day-width);height:var(--day-width);display:flex;justify-content:center;align-items:center}button.svelte-x4itxh{width:var(--day-width);height:var(--day-width);border-radius:50%;padding:0;border:0;background-color:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center}button[data-selected=true].svelte-x4itxh{background-color:var(--color-ui-primary);color:var(--color-theme-offwhite)}button.svelte-x4itxh:focus{box-shadow:0 0 0 calc(var(--size-base) / 8 ) var(--color-theme-gray-lightest);outline:none}button.svelte-x4itxh::-moz-focus-inner{border:0}.day-color.svelte-x4itxh{width:100%;height:calc(var(--day-width) * .85);display:flex;align-items:center;justify-content:center}[data-range-right=true].svelte-x4itxh{background:linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 50%, rgba(0,173,238,0.2) 50%, rgba(0,173,238,0.2) 100%)}[data-range-left=true].svelte-x4itxh{background:linear-gradient(90deg, rgba(0,173,238,0.2) 0%, rgba(0,173,238,0.2) 50%, rgba(255,255,255,0) 50%, rgba(255,255,255,0) 100%)}[data-range-right=true][data-range-left=true].svelte-x4itxh{background:rgba(0,173,238,0.2)}.make-the-background-square-on-safari.svelte-x4itxh{position:relative}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9udGguc3ZlbHRlIiwic291cmNlcyI6WyJNb250aC5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHN2ZWx0ZTpvcHRpb25zIHRhZz1cImRhdGUtcmFuZ2UtaW5wdXQtbW9udGhcIj48L3N2ZWx0ZTpvcHRpb25zPlxuXG48c2NyaXB0PlxuXHRpbXBvcnQgZ2V0TW9udGhOYW1lIGZyb20gJy4vZ2V0LW1vbnRoLW5hbWUuanMnXG5cdGltcG9ydCBnZXREYXlzT2ZUaGVXZWVrIGZyb20gJy4vZ2V0LWRheXMtb2YtdGhlLXdlZWsuanMnXG5cdGltcG9ydCBjYWxlbmRhcml6ZSBmcm9tICdjYWxlbmRhcml6ZSdcblx0aW1wb3J0IHsgZGF0ZXNNYXRjaCwgZGF0ZUd0ZSwgZGF0ZUx0ZSwgZGF0ZUd0LCBkYXRlTHQgfSBmcm9tICcuL2RhdGUtb2JqZWN0LmpzJ1xuXHRpbXBvcnQgbW91c2VFdmVudFNob3VsZEJlUmVhY3RlZFRvIGZyb20gJ2NsaWNrLXNob3VsZC1iZS1pbnRlcmNlcHRlZC1mb3ItbmF2aWdhdGlvbidcblxuXHRpbXBvcnQgeyBjcmVhdGVFdmVudERpc3BhdGNoZXIgfSBmcm9tICdzdmVsdGUnXG5cdGNvbnN0IGRpc3BhdGNoRXZlbnQgPSBjcmVhdGVFdmVudERpc3BhdGNoZXIoKVxuXG5cdGV4cG9ydCBsZXQgc3RhcnQgPSB7XG5cdFx0eWVhcjogMjAyMCxcblx0XHRtb250aDogMSxcblx0XHRkYXk6IDE1XG5cdH1cblxuXHRleHBvcnQgbGV0IGVuZCA9IHtcblx0XHR5ZWFyOiAyMDIwLFxuXHRcdG1vbnRoOiAyLFxuXHRcdGRheTogMTVcblx0fVxuXG5cdGV4cG9ydCBsZXQgdmlzaWJsZU1vbnRoID0ge1xuXHRcdHllYXI6IDIwMjAsXG5cdFx0bW9udGg6IDFcblx0fVxuXG5cdGNvbnN0IGdldE1vbnRoRGF5c0FycmF5cyA9ICh5ZWFyLCBtb250aCkgPT4gY2FsZW5kYXJpemUobmV3IERhdGUoeWVhciwgbW9udGggLSAxKSlcblxuXHQkOiB2aXNpYmxlV2Vla3MgPSBnZXRNb250aERheXNBcnJheXModmlzaWJsZU1vbnRoLnllYXIsIHZpc2libGVNb250aC5tb250aCkubWFwKFxuXHRcdHdlZWtzID0+IHdlZWtzLm1hcChcblx0XHRcdGRheU51bWJlciA9PiBkYXlOdW1iZXIgPyBkYXlBc1Zpc2libGVEYXRlKGRheU51bWJlcikgOiBudWxsXG5cdFx0KVxuXHQpXG5cblx0JDogZGF0ZUlzVmlzaWJseVNlbGVjdGVkID0gKGRhdGUpID0+IHtcblx0XHRyZXR1cm4gZGF0ZXNNYXRjaChkYXRlLCBzdGFydClcblx0XHRcdHx8IGRhdGVzTWF0Y2goZGF0ZSwgZW5kKVxuXHR9XG5cdGNvbnN0IGRheXNPZlRoZVdlZWsgPSBnZXREYXlzT2ZUaGVXZWVrKClcblxuXHRjb25zdCBzd2l0Y2hNb250aCA9IChpbmNyZW1lbnQpID0+IHtcblx0XHRsZXQgeWVhciA9IHZpc2libGVNb250aC55ZWFyXG5cdFx0bGV0IG1vbnRoID0gdmlzaWJsZU1vbnRoLm1vbnRoICsgaW5jcmVtZW50XG5cblx0XHRpZiAobW9udGggPCAxKSB7XG5cdFx0XHRtb250aCArPSAxMlxuXHRcdFx0eWVhciAtPSAxXG5cdFx0fSBlbHNlIGlmIChtb250aCA+IDEyKSB7XG5cdFx0XHRtb250aCAtPSAxMlxuXHRcdFx0eWVhciArPSAxXG5cdFx0fVxuXG5cdFx0dmlzaWJsZU1vbnRoID0ge1xuXHRcdFx0eWVhcixcblx0XHRcdG1vbnRoLFxuXHRcdH1cblx0fVxuXG5cdGNvbnN0IGRheUFzVmlzaWJsZURhdGUgPSBkYXkgPT4gKHtcblx0XHR5ZWFyOiB2aXNpYmxlTW9udGgueWVhcixcblx0XHRtb250aDogdmlzaWJsZU1vbnRoLm1vbnRoLFxuXHRcdGRheSxcblx0fSlcblxuXHRjb25zdCBzdG9wUHJvcGFnYXRpb25BbmRUaGVuID0gZm4gPT4gZXZlbnQgPT4ge1xuXHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG5cdFx0cmV0dXJuIGZuKGV2ZW50KVxuXHR9XG5cblx0Y29uc3QgaWZNb3VzZUV2ZW50U2hvdWxkQmVSZWFjdGVkVG8gPSB0aGVuRG8gPT4gZXZlbnQgPT4ge1xuXHRcdGlmIChtb3VzZUV2ZW50U2hvdWxkQmVSZWFjdGVkVG8oZXZlbnQpKSB7XG5cdFx0XHR0aGVuRG8oZXZlbnQpXG5cdFx0fVxuXHR9XG5cbjwvc2NyaXB0PlxuXG48ZGl2IGNsYXNzPVwiY29udGFpbmVyIGZ1bGwtd2lkdGhcIj5cblx0PGRpdiBjbGFzcz1cImZ1bGwtd2lkdGggbW9udGgtcm93XCI+XG5cdFx0PHNwYW4+XG5cdFx0XHR7Z2V0TW9udGhOYW1lKHZpc2libGVNb250aC5tb250aCl9IHt2aXNpYmxlTW9udGgueWVhcn1cblx0XHQ8L3NwYW4+XG5cdFx0PHNwYW4gc3R5bGU9XCJkaXNwbGF5OiBmbGV4O1wiPlxuXHRcdFx0PGJ1dHRvbiB0eXBlPWJ1dHRvbiBvbjpjbGljaz17c3RvcFByb3BhZ2F0aW9uQW5kVGhlbigoKSA9PiBzd2l0Y2hNb250aCgtMSkpfT5cblx0XHRcdFx04p2uXG5cdFx0XHQ8L2J1dHRvbj5cblx0XHRcdDxidXR0b24gdHlwZT1idXR0b24gb246Y2xpY2s9e3N0b3BQcm9wYWdhdGlvbkFuZFRoZW4oKCkgPT4gc3dpdGNoTW9udGgoMSkpfT5cblx0XHRcdFx04p2vXG5cdFx0XHQ8L2J1dHRvbj5cblx0XHQ8L3NwYW4+XG5cdDwvZGl2PlxuXHQ8ZGl2IGNsYXNzPVwiZnVsbC13aWR0aCB3ZWVrZGF5LW5hbWVzXCI+XG5cdFx0eyNlYWNoIGRheXNPZlRoZVdlZWsgYXMgZGF5T2ZUaGVXZWVrfVxuXHRcdFx0PHNwYW4gY2xhc3M9d2Vla2RheS1uYW1lPlxuXHRcdFx0XHR7ZGF5T2ZUaGVXZWVrfVxuXHRcdFx0PC9zcGFuPlxuXHRcdHsvZWFjaH1cblx0PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJmdWxsLXdpZHRoIHdlZWtzXCI+XG5cdFx0eyNlYWNoIHZpc2libGVXZWVrcyBhcyB3ZWVrfVxuXHRcdFx0PGRpdiBjbGFzcz1cIndlZWtcIj5cblx0XHRcdFx0eyNlYWNoIHdlZWsgYXMgdmlzaWJsZURhdGV9XG5cdFx0XHRcdFx0eyNpZiB2aXNpYmxlRGF0ZSA9PT0gbnVsbH1cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPWRheT5cblxuXHRcdFx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0XHRcdHs6ZWxzZX1cblx0XHRcdFx0XHRcdDxzcGFuXG5cdFx0XHRcdFx0XHRcdGNsYXNzPWRheVxuXHRcdFx0XHRcdFx0PlxuXHRcdFx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0dHlwZT1idXR0b25cblx0XHRcdFx0XHRcdFx0XHRkcmFnZ2FibGU9ZmFsc2Vcblx0XHRcdFx0XHRcdFx0XHRkYXRhLXNlbGVjdGVkPXtkYXRlSXNWaXNpYmx5U2VsZWN0ZWQodmlzaWJsZURhdGUpfVxuXHRcdFx0XHRcdFx0XHRcdG9uOmNsaWNrPXtpZk1vdXNlRXZlbnRTaG91bGRCZVJlYWN0ZWRUbyhcblx0XHRcdFx0XHRcdFx0XHRcdHN0b3BQcm9wYWdhdGlvbkFuZFRoZW4oXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCgpID0+IGRpc3BhdGNoRXZlbnQoJ2RheVNlbGVjdGVkJywgdmlzaWJsZURhdGUpXG5cdFx0XHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHRcdFx0KX1cblx0XHRcdFx0XHRcdFx0XHRvbjptb3VzZW92ZXI9e2lmTW91c2VFdmVudFNob3VsZEJlUmVhY3RlZFRvKFxuXHRcdFx0XHRcdFx0XHRcdFx0KCkgPT4gZGlzcGF0Y2hFdmVudCgnbW91c2VvdmVyRGF0ZScsIHZpc2libGVEYXRlKVxuXHRcdFx0XHRcdFx0XHRcdCl9XG5cdFx0XHRcdFx0XHRcdFx0b246bW91c2Vkb3duPXtpZk1vdXNlRXZlbnRTaG91bGRCZVJlYWN0ZWRUbyhcblx0XHRcdFx0XHRcdFx0XHRcdCgpID0+IGRpc3BhdGNoRXZlbnQoJ21vdXNlZG93bkRhdGUnLCB2aXNpYmxlRGF0ZSlcblx0XHRcdFx0XHRcdFx0XHQpfVxuXHRcdFx0XHRcdFx0XHRcdG9uOm1vdXNldXA9eygpID0+IGRpc3BhdGNoRXZlbnQoJ21vdXNldXBEYXRlJywgdmlzaWJsZURhdGUpfVxuXHRcdFx0XHRcdFx0XHQ+XG5cdFx0XHRcdFx0XHRcdFx0PHNwYW5cblx0XHRcdFx0XHRcdFx0XHRcdGNsYXNzPVwiZGF5LWNvbG9yIG1ha2UtdGhlLWJhY2tncm91bmQtc3F1YXJlLW9uLXNhZmFyaVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXJhbmdlLWxlZnQ9e2RhdGVMdGUodmlzaWJsZURhdGUsIGVuZCkgJiYgZGF0ZUd0KHZpc2libGVEYXRlLCBzdGFydCl9XG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXJhbmdlLXJpZ2h0PXtkYXRlR3RlKHZpc2libGVEYXRlLCBzdGFydCkgJiYgZGF0ZUx0KHZpc2libGVEYXRlLCBlbmQpfVxuXHRcdFx0XHRcdFx0XHRcdD5cblx0XHRcdFx0XHRcdFx0XHRcdHt2aXNpYmxlRGF0ZS5kYXl9XG5cdFx0XHRcdFx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0XHRcdFx0XHQ8L2J1dHRvbj5cblx0XHRcdFx0XHRcdDwvc3Bhbj5cblx0XHRcdFx0XHR7L2lmfVxuXHRcdFx0XHR7L2VhY2h9XG5cdFx0XHQ8L2Rpdj5cblx0XHR7L2VhY2h9XG5cdDwvZGl2PlxuPC9kaXY+XG5cbjxzdHlsZT46cm9vdCwgOmhvc3Qge1xuXHQtLXNpemUtcXVhcnRlcjogLjI1cmVtO1xuXHQtLXNpemUtaGFsZjogLjUwcmVtO1xuXHQtLXNpemUtYmFzZTogMXJlbTtcblx0LS1zaXplLWRvdWJsZTogMnJlbTtcblxuXHQtLWJvcmRlci13aWR0aDogMXB4O1xuXHQtLWJvcmRlci1yYWRpdXM6IHZhcigtLXNpemUtcXVhcnRlcik7XG5cblx0LS1zaXplLWRlZmF1bHQtc3BhY2luZzogdmFyKC0tc2l6ZS1oYWxmKTtcblxuXHQtLWNvbnRyb2wtaGVpZ2h0OiAyLjI1cmVtO1xufVxuXHQ6cm9vdCwgOmhvc3Qge1xuXHQtLXRleHQtZm9udC1zaXplLXNtYWxsOiBjYWxjKHZhcigtLXNpemUtYmFzZSkgKiAuNzUpO1xuXHQtLXRleHQtZm9udC1zaXplLWJhc2U6IHZhcigtLXNpemUtYmFzZSk7XG5cdC0tdGV4dC1mb250LWZhbWlseTogUm9ib3RvLCBzYW5zLXNlcmlmO1xuXHQtLXRleHQtZm9udC13ZWlnaHQtYmFzZTogNDAwO1xuXHQtLXRleHQtZm9udC13ZWlnaHQtYm9sZDogNzAwO1xufVxuXHQ6cm9vdCwgOmhvc3Qge1xuXHQtLWNvbG9yLWJyYW5kLXByaW1hcnk6ICM2MTYxNjE7XG5cdC0tY29sb3ItYnJhbmQtc2Vjb25kYXJ5OiAjNDI0MjQyO1xuXG5cdC0tY29sb3ItdWktcHJpbWFyeTogIzAwYWRlZTtcblx0LS1jb2xvci11aS1lcy1vcmFuZ2U6ICNmNjkxMWU7XG5cblx0LS1jb2xvci10aGVtZS1kZWZhdWx0OiAjNjE2MTYxO1xuXHQtLWNvbG9yLXRoZW1lLXdoaXRlOiAjZmZmZmZmO1xuXHQtLWNvbG9yLXRoZW1lLW9mZndoaXRlOiAjZmFmYWZhO1xuXHQtLWNvbG9yLXRoZW1lLWdyYXk6ICM5ZTllOWU7XG5cdC0tY29sb3ItdGhlbWUtZ3JheS1saWdodGVyOiAjYmRiZGJkO1xuXHQtLWNvbG9yLXRoZW1lLWdyYXktbGlnaHRlc3Q6ICNkMGQwZDA7XG5cdC0tY29sb3ItdGhlbWUtY2hhcmNvYWw6ICMyMzIzMjM7XG5cdC0tY29sb3ItdGhlbWUtYmxhY2s6ICMwMDAwMDA7XG5cdC0tY29sb3ItdGhlbWUtbXV0ZTogI2UwZTBlMDtcblx0LS1jb2xvci10aGVtZS1ncmVlbjogIzYzYTgzYztcblx0LS1jb2xvci10aGVtZS1yZWQ6ICNkZDFhMjI7XG5cdC0tY29sb3ItdGhlbWUtcHVycGxlOiAjN2U0Y2ViO1xuXHQtLWNvbG9yLXRoZW1lLW9yYW5nZTogI2Y2OTExZTtcblxuXHQtLXNlY3Rpb24tY29udGFpbmVyLWJhY2tncm91bmQtY29sb3I6IHZhcigtLWNvbG9yLXRoZW1lLW9mZndoaXRlKTtcbn1cblx0LypcbkF0IHNvbWUgcG9pbnQgd2UgbmVlZCB0b2tlbiBuYW1lcyB0aGF0IGltcGx5IGhvdyB0aGUgY29sb3JzIHNob3VsZCBiZSB1c2VkLlxuXG5JZGVhczogXCJlcnJvclwiIGFuZCBcImNhbmNlbFwiIGZvciBob3cgd2UgdXNlIHJlZCBub3dcblwic3VjY2Vzc1wiIGFuZCBcInZhbGlkXCIgZm9yIGdyZWVuXG4qL1xuXHQvKiBAaW1wb3J0IFwiaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbS9jc3M/ZmFtaWx5PVJvYm90bzo0MDAsNzAwXCI7ICovXG5cdCoge1xuXHRib3gtc2l6aW5nOiBib3JkZXItYm94O1xufVxuXHRodG1sLCA6aG9zdCB7XG5cdGZvbnQtc2l6ZTogMTZweDtcblx0Zm9udC13ZWlnaHQ6IDQwMDtcbn1cblx0Ym9keSwgOmhvc3Qge1xuXHRmb250LWZhbWlseTogdmFyKC0tdGV4dC1mb250LWZhbWlseSk7XG5cdGZvbnQtc2l6ZTogdmFyKC0tdGV4dC1mb250LXNpemUtYmFzZSk7XG59XG5cdC5jb250YWluZXIge1xuXHRcdC0tZGF5LXdpZHRoOiBjYWxjKHZhcigtLXNpemUtYmFzZSkgKiAxLjc1KTtcblx0XHQtLW1vbnRoLXdpZHRoOiBjYWxjKHZhcigtLWRheS13aWR0aCkgKiA3KTtcblxuXHRcdGZvbnQtZmFtaWx5OiB2YXIoLS10ZXh0LWZvbnQtZmFtaWx5KTtcblx0XHRjb2xvcjogdmFyKC0tY29sb3ItdGhlbWUtY2hhcmNvYWwpO1xuXHRcdGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG5cdFx0ZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcblx0fVxuXHQuZnVsbC13aWR0aCB7XG5cdFx0d2lkdGg6IHZhcigtLW1vbnRoLXdpZHRoKTtcblx0XHRkaXNwbGF5OiBmbGV4O1xuXHR9XG5cdC5tb250aC1yb3cge1xuXHRcdGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2Vlbjtcblx0XHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRcdHBhZGRpbmctYm90dG9tOiB2YXIoLS1zaXplLXF1YXJ0ZXIpO1xuXHR9XG5cdC53ZWVrZGF5LW5hbWVzIHtcblx0XHRmb250LXNpemU6IHZhcigtLXNpemUtaGFsZik7XG5cdFx0dGV4dC1hbGlnbjogY2VudGVyO1xuXHRcdHBhZGRpbmc6IHZhcigtLXNpemUtcXVhcnRlcikgMDtcblx0XHRjb2xvcjogdmFyKC0tY29sb3ItdGhlbWUtZGVmYXVsdCk7XG5cdH1cblx0LndlZWtkYXktbmFtZSB7XG5cdFx0ZmxleC1ncm93OiAxO1xuXHR9XG5cdC53ZWVrcyB7XG5cdFx0ZGlzcGxheTogZmxleDtcblx0XHRmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuXHRcdGFsaWduLWl0ZW1zOiBzdHJldGNoO1xuXHR9XG5cdC53ZWVrIHtcblx0XHRkaXNwbGF5OiBmbGV4O1xuXHRcdHRleHQtYWxpZ246IGNlbnRlcjtcblx0XHRmb250LXNpemU6IGNhbGModmFyKC0tc2l6ZS1iYXNlKSAqIC43NSk7XG5cdH1cblx0LmRheSB7XG5cdFx0d2lkdGg6IHZhcigtLWRheS13aWR0aCk7XG5cdFx0aGVpZ2h0OiB2YXIoLS1kYXktd2lkdGgpO1xuXG5cdFx0ZGlzcGxheTogZmxleDtcblx0XHRqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcblx0XHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHR9XG5cdGJ1dHRvbiB7XG5cdFx0d2lkdGg6IHZhcigtLWRheS13aWR0aCk7XG5cdFx0aGVpZ2h0OiB2YXIoLS1kYXktd2lkdGgpO1xuXHRcdGJvcmRlci1yYWRpdXM6IDUwJTtcblx0XHRwYWRkaW5nOiAwO1xuXHRcdGJvcmRlcjogMDtcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcblx0XHRjdXJzb3I6IHBvaW50ZXI7XG5cdFx0ZGlzcGxheTogZmxleDtcblx0XHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRcdGp1c3RpZnktY29udGVudDogY2VudGVyO1xuXHR9XG5cdGJ1dHRvbltkYXRhLXNlbGVjdGVkPXRydWVdIHtcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1jb2xvci11aS1wcmltYXJ5KTtcblx0XHRjb2xvcjogdmFyKC0tY29sb3ItdGhlbWUtb2Zmd2hpdGUpO1xuXHR9XG5cdGJ1dHRvbjpmb2N1cyB7XG5cdFx0Ym94LXNoYWRvdzogMCAwIDAgY2FsYyh2YXIoLS1zaXplLWJhc2UpIC8gOCApIHZhcigtLWNvbG9yLXRoZW1lLWdyYXktbGlnaHRlc3QpO1xuXHRcdG91dGxpbmU6IG5vbmU7XG5cdH1cblx0YnV0dG9uOjotbW96LWZvY3VzLWlubmVyIHtcblx0XHRib3JkZXI6IDA7XG5cdH1cblx0LmRheS1jb2xvciB7XG5cdFx0d2lkdGg6IDEwMCU7XG5cdFx0aGVpZ2h0OiBjYWxjKHZhcigtLWRheS13aWR0aCkgKiAuODUpO1xuXHRcdGRpc3BsYXk6IGZsZXg7XG5cdFx0YWxpZ24taXRlbXM6IGNlbnRlcjtcblx0XHRqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcblx0fVxuXHRbZGF0YS1yYW5nZS1yaWdodD10cnVlXSB7XG5cdFx0YmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KDkwZGVnLCByZ2JhKDI1NSwyNTUsMjU1LDApIDAlLCByZ2JhKDI1NSwyNTUsMjU1LDApIDUwJSwgcmdiYSgwLDE3MywyMzgsMC4yKSA1MCUsIHJnYmEoMCwxNzMsMjM4LDAuMikgMTAwJSk7XG5cdH1cblx0W2RhdGEtcmFuZ2UtbGVmdD10cnVlXSB7XG5cdFx0YmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KDkwZGVnLCByZ2JhKDAsMTczLDIzOCwwLjIpIDAlLCByZ2JhKDAsMTczLDIzOCwwLjIpIDUwJSwgcmdiYSgyNTUsMjU1LDI1NSwwKSA1MCUsIHJnYmEoMjU1LDI1NSwyNTUsMCkgMTAwJSk7XG5cdH1cblx0W2RhdGEtcmFuZ2UtcmlnaHQ9dHJ1ZV1bZGF0YS1yYW5nZS1sZWZ0PXRydWVdIHtcblx0XHRiYWNrZ3JvdW5kOiByZ2JhKDAsMTczLDIzOCwwLjIpO1xuXHR9XG5cdC5tYWtlLXRoZS1iYWNrZ3JvdW5kLXNxdWFyZS1vbi1zYWZhcmkge1xuXHRcdHBvc2l0aW9uOiByZWxhdGl2ZTtcblx0fVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD1zcmMvTW9udGguc3ZlbHRlLm1hcCAq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 */";
    	append_dev(document.head, style);
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    // (96:2) {#each daysOfTheWeek as dayOfTheWeek}
    function create_each_block_2(ctx) {
    	let span;
    	let t0_value = /*dayOfTheWeek*/ ctx[24] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(span, "class", "weekday-name svelte-x4itxh");
    			add_location(span, file, 96, 3, 2159);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(96:2) {#each daysOfTheWeek as dayOfTheWeek}",
    		ctx
    	});

    	return block;
    }

    // (110:5) {:else}
    function create_else_block(ctx) {
    	let span1;
    	let button;
    	let span0;
    	let t_value = /*visibleDate*/ ctx[21].day + "";
    	let t;
    	let span0_data_range_left_value;
    	let span0_data_range_right_value;
    	let button_data_selected_value;
    	let dispose;

    	function click_handler_2(...args) {
    		return /*click_handler_2*/ ctx[14](/*visibleDate*/ ctx[21], ...args);
    	}

    	function mouseover_handler(...args) {
    		return /*mouseover_handler*/ ctx[15](/*visibleDate*/ ctx[21], ...args);
    	}

    	function mousedown_handler(...args) {
    		return /*mousedown_handler*/ ctx[16](/*visibleDate*/ ctx[21], ...args);
    	}

    	function mouseup_handler(...args) {
    		return /*mouseup_handler*/ ctx[17](/*visibleDate*/ ctx[21], ...args);
    	}

    	const block = {
    		c: function create() {
    			span1 = element("span");
    			button = element("button");
    			span0 = element("span");
    			t = text(t_value);
    			attr_dev(span0, "class", "day-color make-the-background-square-on-safari svelte-x4itxh");
    			attr_dev(span0, "data-range-left", span0_data_range_left_value = dateLte(/*visibleDate*/ ctx[21], /*end*/ ctx[2]) && dateGt(/*visibleDate*/ ctx[21], /*start*/ ctx[1]));
    			attr_dev(span0, "data-range-right", span0_data_range_right_value = dateGte(/*visibleDate*/ ctx[21], /*start*/ ctx[1]) && dateLt(/*visibleDate*/ ctx[21], /*end*/ ctx[2]));
    			add_location(span0, file, 130, 8, 3082);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "draggable", "false");
    			attr_dev(button, "data-selected", button_data_selected_value = /*dateIsVisiblySelected*/ ctx[4](/*visibleDate*/ ctx[21]));
    			attr_dev(button, "class", "svelte-x4itxh");
    			add_location(button, file, 113, 7, 2477);
    			attr_dev(span1, "class", "day svelte-x4itxh");
    			add_location(span1, file, 110, 6, 2439);

    			dispose = [
    				listen_dev(
    					button,
    					"click",
    					function () {
    						/*ifMouseEventShouldBeReactedTo*/ ctx[9](/*stopPropagationAndThen*/ ctx[8](click_handler_2)).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				),
    				listen_dev(
    					button,
    					"mouseover",
    					function () {
    						/*ifMouseEventShouldBeReactedTo*/ ctx[9](mouseover_handler).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				),
    				listen_dev(
    					button,
    					"mousedown",
    					function () {
    						/*ifMouseEventShouldBeReactedTo*/ ctx[9](mousedown_handler).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				),
    				listen_dev(button, "mouseup", mouseup_handler, false, false, false)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span1, anchor);
    			append_dev(span1, button);
    			append_dev(button, span0);
    			append_dev(span0, t);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*visibleWeeks*/ 8 && t_value !== (t_value = /*visibleDate*/ ctx[21].day + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*visibleWeeks, end, start*/ 14 && span0_data_range_left_value !== (span0_data_range_left_value = dateLte(/*visibleDate*/ ctx[21], /*end*/ ctx[2]) && dateGt(/*visibleDate*/ ctx[21], /*start*/ ctx[1]))) {
    				attr_dev(span0, "data-range-left", span0_data_range_left_value);
    			}

    			if (dirty[0] & /*visibleWeeks, start, end*/ 14 && span0_data_range_right_value !== (span0_data_range_right_value = dateGte(/*visibleDate*/ ctx[21], /*start*/ ctx[1]) && dateLt(/*visibleDate*/ ctx[21], /*end*/ ctx[2]))) {
    				attr_dev(span0, "data-range-right", span0_data_range_right_value);
    			}

    			if (dirty[0] & /*dateIsVisiblySelected, visibleWeeks*/ 24 && button_data_selected_value !== (button_data_selected_value = /*dateIsVisiblySelected*/ ctx[4](/*visibleDate*/ ctx[21]))) {
    				attr_dev(button, "data-selected", button_data_selected_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(110:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (106:5) {#if visibleDate === null}
    function create_if_block(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			attr_dev(span, "class", "day svelte-x4itxh");
    			add_location(span, file, 106, 6, 2388);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(106:5) {#if visibleDate === null}",
    		ctx
    	});

    	return block;
    }

    // (105:4) {#each week as visibleDate}
    function create_each_block_1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*visibleDate*/ ctx[21] === null) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(105:4) {#each week as visibleDate}",
    		ctx
    	});

    	return block;
    }

    // (103:2) {#each visibleWeeks as week}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*week*/ ctx[18];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "week svelte-x4itxh");
    			add_location(div, file, 103, 3, 2299);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*visibleWeeks, dateIsVisiblySelected, ifMouseEventShouldBeReactedTo, stopPropagationAndThen, dispatchEvent, end, start*/ 830) {
    				each_value_1 = /*week*/ ctx[18];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(103:2) {#each visibleWeeks as week}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div3;
    	let div0;
    	let span0;
    	let t0_value = getMonthName(/*visibleMonth*/ ctx[0].month) + "";
    	let t0;
    	let t1;
    	let t2_value = /*visibleMonth*/ ctx[0].year + "";
    	let t2;
    	let t3;
    	let span1;
    	let button0;
    	let t5;
    	let button1;
    	let t7;
    	let div1;
    	let t8;
    	let div2;
    	let dispose;
    	let each_value_2 = /*daysOfTheWeek*/ ctx[6];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value = /*visibleWeeks*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = space();
    			span1 = element("span");
    			button0 = element("button");
    			button0.textContent = "❮";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "❯";
    			t7 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t8 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(span0, "class", "svelte-x4itxh");
    			add_location(span0, file, 82, 2, 1752);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "svelte-x4itxh");
    			add_location(button0, file, 86, 3, 1862);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "svelte-x4itxh");
    			add_location(button1, file, 89, 3, 1962);
    			set_style(span1, "display", "flex");
    			attr_dev(span1, "class", "svelte-x4itxh");
    			add_location(span1, file, 85, 2, 1829);
    			attr_dev(div0, "class", "full-width month-row svelte-x4itxh");
    			add_location(div0, file, 81, 1, 1715);
    			attr_dev(div1, "class", "full-width weekday-names svelte-x4itxh");
    			add_location(div1, file, 94, 1, 2077);
    			attr_dev(div2, "class", "full-width weeks svelte-x4itxh");
    			add_location(div2, file, 101, 1, 2234);
    			attr_dev(div3, "class", "container full-width svelte-x4itxh");
    			add_location(div3, file, 80, 0, 1679);

    			dispose = [
    				listen_dev(button0, "click", /*stopPropagationAndThen*/ ctx[8](/*click_handler*/ ctx[12]), false, false, false),
    				listen_dev(button1, "click", /*stopPropagationAndThen*/ ctx[8](/*click_handler_1*/ ctx[13]), false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, span0);
    			append_dev(span0, t0);
    			append_dev(span0, t1);
    			append_dev(span0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, span1);
    			append_dev(span1, button0);
    			append_dev(span1, t5);
    			append_dev(span1, button1);
    			append_dev(div3, t7);
    			append_dev(div3, div1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div1, null);
    			}

    			append_dev(div3, t8);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*visibleMonth*/ 1 && t0_value !== (t0_value = getMonthName(/*visibleMonth*/ ctx[0].month) + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*visibleMonth*/ 1 && t2_value !== (t2_value = /*visibleMonth*/ ctx[0].year + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*daysOfTheWeek*/ 64) {
    				each_value_2 = /*daysOfTheWeek*/ ctx[6];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_2.length;
    			}

    			if (dirty[0] & /*visibleWeeks, dateIsVisiblySelected, ifMouseEventShouldBeReactedTo, stopPropagationAndThen, dispatchEvent, end, start*/ 830) {
    				each_value = /*visibleWeeks*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatchEvent = createEventDispatcher();
    	let { start = { year: 2020, month: 1, day: 15 } } = $$props;
    	let { end = { year: 2020, month: 2, day: 15 } } = $$props;
    	let { visibleMonth = { year: 2020, month: 1 } } = $$props;
    	const getMonthDaysArrays = (year, month) => calendarize(new Date(year, month - 1));
    	const daysOfTheWeek = getDaysOfTheWeek();

    	const switchMonth = increment => {
    		let year = visibleMonth.year;
    		let month = visibleMonth.month + increment;

    		if (month < 1) {
    			month += 12;
    			year -= 1;
    		} else if (month > 12) {
    			month -= 12;
    			year += 1;
    		}

    		$$invalidate(0, visibleMonth = { year, month });
    	};

    	const dayAsVisibleDate = day => ({
    		year: visibleMonth.year,
    		month: visibleMonth.month,
    		day
    	});

    	const stopPropagationAndThen = fn => event => {
    		event.stopPropagation();
    		return fn(event);
    	};

    	const ifMouseEventShouldBeReactedTo = thenDo => event => {
    		if (clickShouldBeInterceptedForNavigation(event)) {
    			thenDo(event);
    		}
    	};

    	const writable_props = ["start", "end", "visibleMonth"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Month> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => switchMonth(-1);
    	const click_handler_1 = () => switchMonth(1);
    	const click_handler_2 = visibleDate => dispatchEvent("daySelected", visibleDate);
    	const mouseover_handler = visibleDate => dispatchEvent("mouseoverDate", visibleDate);
    	const mousedown_handler = visibleDate => dispatchEvent("mousedownDate", visibleDate);
    	const mouseup_handler = visibleDate => dispatchEvent("mouseupDate", visibleDate);

    	$$self.$set = $$props => {
    		if ("start" in $$props) $$invalidate(1, start = $$props.start);
    		if ("end" in $$props) $$invalidate(2, end = $$props.end);
    		if ("visibleMonth" in $$props) $$invalidate(0, visibleMonth = $$props.visibleMonth);
    	};

    	$$self.$capture_state = () => {
    		return {
    			start,
    			end,
    			visibleMonth,
    			visibleWeeks,
    			dateIsVisiblySelected
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("start" in $$props) $$invalidate(1, start = $$props.start);
    		if ("end" in $$props) $$invalidate(2, end = $$props.end);
    		if ("visibleMonth" in $$props) $$invalidate(0, visibleMonth = $$props.visibleMonth);
    		if ("visibleWeeks" in $$props) $$invalidate(3, visibleWeeks = $$props.visibleWeeks);
    		if ("dateIsVisiblySelected" in $$props) $$invalidate(4, dateIsVisiblySelected = $$props.dateIsVisiblySelected);
    	};

    	let visibleWeeks;
    	let dateIsVisiblySelected;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*visibleMonth*/ 1) {
    			 $$invalidate(3, visibleWeeks = getMonthDaysArrays(visibleMonth.year, visibleMonth.month).map(weeks => weeks.map(dayNumber => dayNumber ? dayAsVisibleDate(dayNumber) : null)));
    		}

    		if ($$self.$$.dirty[0] & /*start, end*/ 6) {
    			 $$invalidate(4, dateIsVisiblySelected = date => {
    				return datesMatch(date, start) || datesMatch(date, end);
    			});
    		}
    	};

    	return [
    		visibleMonth,
    		start,
    		end,
    		visibleWeeks,
    		dateIsVisiblySelected,
    		dispatchEvent,
    		daysOfTheWeek,
    		switchMonth,
    		stopPropagationAndThen,
    		ifMouseEventShouldBeReactedTo,
    		getMonthDaysArrays,
    		dayAsVisibleDate,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		mouseover_handler,
    		mousedown_handler,
    		mouseup_handler
    	];
    }

    class Month extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-x4itxh-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, { start: 1, end: 2, visibleMonth: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Month",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get start() {
    		throw new Error("<Month>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set start(value) {
    		throw new Error("<Month>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get end() {
    		throw new Error("<Month>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set end(value) {
    		throw new Error("<Month>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get visibleMonth() {
    		throw new Error("<Month>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set visibleMonth(value) {
    		throw new Error("<Month>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/DateRangeInput.svelte generated by Svelte v3.16.4 */
    const file$1 = "src/DateRangeInput.svelte";

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-1ap5jmo-style";
    	style.textContent = ":root,.svelte-1ap5jmo:host{--size-quarter:.25rem;--size-half:.50rem;--size-base:1rem;--size-double:2rem;--border-width:1px;--border-radius:var(--size-quarter);--size-default-spacing:var(--size-half);--control-height:2.25rem}:root,.svelte-1ap5jmo:host{--text-font-size-small:calc(var(--size-base) * .75);--text-font-size-base:var(--size-base);--text-font-family:Roboto, sans-serif;--text-font-weight-base:400;--text-font-weight-bold:700}.svelte-1ap5jmo{box-sizing:border-box}.svelte-1ap5jmo:host{font-size:16px;font-weight:400}.svelte-1ap5jmo:host{font-family:var(--text-font-family);font-size:var(--text-font-size-base)}.container.svelte-1ap5jmo{display:flex}.hspace.svelte-1ap5jmo{width:var(--size-base)}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0ZVJhbmdlSW5wdXQuc3ZlbHRlIiwic291cmNlcyI6WyJEYXRlUmFuZ2VJbnB1dC5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHN2ZWx0ZTp3aW5kb3cgb246bW91c2V1cD17Y2xlYXJBbnlNb3VzZURvd259Pjwvc3ZlbHRlOndpbmRvdz5cblxuPHNjcmlwdD5cblx0aW1wb3J0IE1vbnRoIGZyb20gJy4vTW9udGguc3ZlbHRlJ1xuXHRpbXBvcnQgeyBkYXRlc01hdGNoLCBkYXRlTHQsIGRhdGVMdGUsIGRhdGVHdCB9IGZyb20gJy4vZGF0ZS1vYmplY3QuanMnXG5cdGltcG9ydCB7IGNyZWF0ZUV2ZW50RGlzcGF0Y2hlciB9IGZyb20gXCJzdmVsdGVcIlxuXG5cdGNvbnN0IGRpc3BhdGNoID0gY3JlYXRlRXZlbnREaXNwYXRjaGVyKClcblxuXHRleHBvcnQgbGV0IHN0YXJ0ID0ge1xuXHRcdHllYXI6IDIwMjAsXG5cdFx0bW9udGg6IDEsXG5cdFx0ZGF5OiAxNVxuXHR9XG5cblx0ZXhwb3J0IGxldCBlbmQgPSB7XG5cdFx0eWVhcjogMjAyMCxcblx0XHRtb250aDogMixcblx0XHRkYXk6IDE1XG5cdH1cblxuXHRsZXQgdXNlclNlbGVjdGVkU3RhcnQgPSBudWxsXG5cdGxldCB1c2VyU2VsZWN0ZWRFbmQgPSBudWxsXG5cblx0JDoge1xuXHRcdGlmICh1c2VyU2VsZWN0ZWRTdGFydCB8fCB1c2VyU2VsZWN0ZWRFbmQpIHtcblx0XHRcdGlmICh1c2VyU2VsZWN0ZWRTdGFydCkge1xuXHRcdFx0XHRzdGFydCA9IHVzZXJTZWxlY3RlZFN0YXJ0XG5cdFx0XHRcdHVzZXJTZWxlY3RlZFN0YXJ0ID0gbnVsbFxuXHRcdFx0fVxuXG5cdFx0XHRpZiAodXNlclNlbGVjdGVkRW5kKSB7XG5cdFx0XHRcdGVuZCA9IHVzZXJTZWxlY3RlZEVuZFxuXHRcdFx0XHR1c2VyU2VsZWN0ZWRFbmQgPSBudWxsXG5cdFx0XHR9XG5cblx0XHRcdGRpc3BhdGNoKCdjaGFuZ2UnLCB7IHN0YXJ0LCBlbmQgfSlcblx0XHR9XG5cdH1cblxuXHRsZXQgc3RhcnRNb3VzZURvd24gPSBudWxsXG5cdGxldCBlbmRNb3VzZURvd24gPSBudWxsXG5cblx0bGV0IG1vdXNlb3ZlckRhdGUgPSBudWxsXG5cblx0ZXhwb3J0IGxldCB2aXNpYmxlU3RhcnRNb250aCA9IHtcblx0XHR5ZWFyOiBzdGFydC55ZWFyLFxuXHRcdG1vbnRoOiBzdGFydC5tb250aCxcblx0fVxuXG5cdGV4cG9ydCBsZXQgdmlzaWJsZUVuZE1vbnRoID0ge1xuXHRcdHllYXI6IGVuZC55ZWFyLFxuXHRcdG1vbnRoOiBlbmQubW9udGgsXG5cdH1cblxuXHRjb25zdCBkYXRlc0FzUmFuZ2UgPSAoZGF0ZUEsIGRhdGVCKSA9PiB7XG5cdFx0aWYgKGRhdGVMdGUoZGF0ZUEsIGRhdGVCKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c3RhcnQ6IGRhdGVBLFxuXHRcdFx0XHRlbmQ6IGRhdGVCXG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHN0YXJ0OiBkYXRlQixcblx0XHRcdFx0ZW5kOiBkYXRlQVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGNvbnN0IGdldERpc3BsYXlSYW5nZSA9ICh7XG5cdFx0c3RhcnQsXG5cdFx0ZW5kLFxuXHRcdHN0YXJ0TW91c2VEb3duLFxuXHRcdGVuZE1vdXNlRG93bixcblx0XHRtb3VzZW92ZXJEYXRlXG5cdH0pID0+IHtcblx0XHRpZiAoc3RhcnRNb3VzZURvd24pIHtcblx0XHRcdHN0YXJ0ID0gc3RhcnRNb3VzZURvd25cblx0XHRcdGlmIChtb3VzZW92ZXJEYXRlICYmICFkYXRlc01hdGNoKG1vdXNlb3ZlckRhdGUsIHN0YXJ0KSkge1xuXHRcdFx0XHRlbmQgPSBtb3VzZW92ZXJEYXRlXG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChlbmRNb3VzZURvd24pIHtcblx0XHRcdGVuZCA9IGVuZE1vdXNlRG93blxuXHRcdFx0aWYgKG1vdXNlb3ZlckRhdGUgJiYgIWRhdGVzTWF0Y2gobW91c2VvdmVyRGF0ZSwgZW5kKSkge1xuXHRcdFx0XHRzdGFydCA9IG1vdXNlb3ZlckRhdGVcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gZGF0ZXNBc1JhbmdlKHN0YXJ0LCBlbmQpXG5cdH1cblxuXHQkOiBkaXNwbGF5UmFuZ2UgPSBnZXREaXNwbGF5UmFuZ2UoeyBzdGFydCwgZW5kLCBzdGFydE1vdXNlRG93biwgZW5kTW91c2VEb3duLCBtb3VzZW92ZXJEYXRlIH0pXG5cblx0Y29uc3QgY2xlYXJBbnlNb3VzZURvd24gPSAoKSA9PiB7XG5cdFx0c3RhcnRNb3VzZURvd24gPSBlbmRNb3VzZURvd24gPSBudWxsXG5cdH1cblxuXHRjb25zdCBvbk1vdXNlb3ZlckRhdGUgPSAoeyBkZXRhaWw6IGRhdGUgfSkgPT4ge1xuXHRcdGlmIChzdGFydE1vdXNlRG93biB8fCBlbmRNb3VzZURvd24pIHtcblx0XHRcdG1vdXNlb3ZlckRhdGUgPSBkYXRlXG5cdFx0fVxuXHR9XG5cblx0Y29uc3Qgb25Nb3VzZXVwRGF0ZSA9ICh7IGRldGFpbDogZGF0ZSB9KSA9PiB7XG5cdFx0Y29uc3QgbW91c2VXYXNEb3duID0gc3RhcnRNb3VzZURvd24gfHwgZW5kTW91c2VEb3duXG5cdFx0Y29uc3Qgd2FzQUNsaWNrT25TdGFydCA9IHN0YXJ0TW91c2VEb3duICYmIGRhdGVzTWF0Y2goZGF0ZSwgc3RhcnRNb3VzZURvd24pXG5cdFx0Y29uc3Qgd2FzQUNsaWNrT25FbmQgPSBlbmRNb3VzZURvd24gJiYgZGF0ZXNNYXRjaChkYXRlLCBlbmRNb3VzZURvd24pXG5cblx0XHRpZiAobW91c2VXYXNEb3duICYmICF3YXNBQ2xpY2tPblN0YXJ0ICYmICF3YXNBQ2xpY2tPbkVuZCkge1xuXHRcdFx0dXNlclNlbGVjdGVkU3RhcnQgPSBkaXNwbGF5UmFuZ2Uuc3RhcnRcblx0XHRcdHVzZXJTZWxlY3RlZEVuZCA9IGRpc3BsYXlSYW5nZS5lbmRcblx0XHR9XG5cdH1cblxuXHRjb25zdCBvblN0YXJ0RGF5U2VsZWN0ZWQgPSAoeyBkZXRhaWw6IGRhdGUgfSkgPT4ge1xuXHRcdGNsZWFyQW55TW91c2VEb3duKClcblx0XHRpZiAoZGF0ZUd0KGRhdGUsIGVuZCkpIHtcblx0XHRcdHVzZXJTZWxlY3RlZFN0YXJ0ID0gZW5kXG5cdFx0XHR1c2VyU2VsZWN0ZWRFbmQgPSBkYXRlXG5cdFx0fSBlbHNlIGlmICghZGF0ZXNNYXRjaChkYXRlLCBzdGFydCkpIHtcblx0XHRcdHVzZXJTZWxlY3RlZFN0YXJ0ID0gZGF0ZVxuXHRcdH1cblx0fVxuXG5cdGNvbnN0IG9uRW5kRGF5U2VsZWN0ZWQgPSAoeyBkZXRhaWw6IGRhdGUgfSkgPT4ge1xuXHRcdGNsZWFyQW55TW91c2VEb3duKClcblx0XHRpZiAoZGF0ZUx0KGRhdGUsIHN0YXJ0KSkge1xuXHRcdFx0dXNlclNlbGVjdGVkRW5kID0gc3RhcnRcblx0XHRcdHVzZXJTZWxlY3RlZFN0YXJ0ID0gZGF0ZVxuXHRcdH0gZWxzZSBpZiAoIWRhdGVzTWF0Y2goZGF0ZSwgZW5kKSkge1xuXHRcdFx0dXNlclNlbGVjdGVkRW5kID0gZGF0ZVxuXHRcdH1cblx0fVxuPC9zY3JpcHQ+XG5cbjxkaXYgY2xhc3M9XCJjb250YWluZXJcIj5cblx0PE1vbnRoXG5cdFx0c3RhcnQ9e2Rpc3BsYXlSYW5nZS5zdGFydH1cblx0XHRlbmQ9e2Rpc3BsYXlSYW5nZS5lbmR9XG5cblx0XHRvbjptb3VzZWRvd25EYXRlPXsoeyBkZXRhaWw6IGRhdGUgfSkgPT4gbW91c2VvdmVyRGF0ZSA9IHN0YXJ0TW91c2VEb3duID0gZGF0ZX1cblx0XHRvbjptb3VzZW92ZXJEYXRlPXtvbk1vdXNlb3ZlckRhdGV9XG5cdFx0b246bW91c2V1cERhdGU9e29uTW91c2V1cERhdGV9XG5cdFx0b246ZGF5U2VsZWN0ZWQ9e29uU3RhcnREYXlTZWxlY3RlZH1cblxuXHRcdGJpbmQ6dmlzaWJsZU1vbnRoPXt2aXNpYmxlU3RhcnRNb250aH1cblx0PjwvTW9udGg+XG5cdDxzcGFuIGNsYXNzPVwiaHNwYWNlXCI+PC9zcGFuPlxuXHQ8TW9udGhcblx0XHRzdGFydD17ZGlzcGxheVJhbmdlLnN0YXJ0fVxuXHRcdGVuZD17ZGlzcGxheVJhbmdlLmVuZH1cblxuXHRcdG9uOm1vdXNlZG93bkRhdGU9eyh7IGRldGFpbDogZGF0ZSB9KSA9PiBtb3VzZW92ZXJEYXRlID0gZW5kTW91c2VEb3duID0gZGF0ZX1cblx0XHRvbjptb3VzZW92ZXJEYXRlPXtvbk1vdXNlb3ZlckRhdGV9XG5cdFx0b246bW91c2V1cERhdGU9e29uTW91c2V1cERhdGV9XG5cdFx0b246ZGF5U2VsZWN0ZWQ9e29uRW5kRGF5U2VsZWN0ZWR9XG5cblx0XHRiaW5kOnZpc2libGVNb250aD17dmlzaWJsZUVuZE1vbnRofVxuXHQ+PC9Nb250aD5cbjwvZGl2PlxuXG48c3R5bGU+LyogQGltcG9ydCBcImh0dHBzOi8vZm9udHMuZ29vZ2xlYXBpcy5jb20vY3NzP2ZhbWlseT1Sb2JvdG86NDAwLDcwMFwiOyAqL1xuOnJvb3QsIDpob3N0IHtcblx0LS1zaXplLXF1YXJ0ZXI6IC4yNXJlbTtcblx0LS1zaXplLWhhbGY6IC41MHJlbTtcblx0LS1zaXplLWJhc2U6IDFyZW07XG5cdC0tc2l6ZS1kb3VibGU6IDJyZW07XG5cblx0LS1ib3JkZXItd2lkdGg6IDFweDtcblx0LS1ib3JkZXItcmFkaXVzOiB2YXIoLS1zaXplLXF1YXJ0ZXIpO1xuXG5cdC0tc2l6ZS1kZWZhdWx0LXNwYWNpbmc6IHZhcigtLXNpemUtaGFsZik7XG5cblx0LS1jb250cm9sLWhlaWdodDogMi4yNXJlbTtcbn1cbjpyb290LCA6aG9zdCB7XG5cdC0tdGV4dC1mb250LXNpemUtc21hbGw6IGNhbGModmFyKC0tc2l6ZS1iYXNlKSAqIC43NSk7XG5cdC0tdGV4dC1mb250LXNpemUtYmFzZTogdmFyKC0tc2l6ZS1iYXNlKTtcblx0LS10ZXh0LWZvbnQtZmFtaWx5OiBSb2JvdG8sIHNhbnMtc2VyaWY7XG5cdC0tdGV4dC1mb250LXdlaWdodC1iYXNlOiA0MDA7XG5cdC0tdGV4dC1mb250LXdlaWdodC1ib2xkOiA3MDA7XG59XG4qIHtcblx0Ym94LXNpemluZzogYm9yZGVyLWJveDtcbn1cbmh0bWwsIDpob3N0IHtcblx0Zm9udC1zaXplOiAxNnB4O1xuXHRmb250LXdlaWdodDogNDAwO1xufVxuYm9keSwgOmhvc3Qge1xuXHRmb250LWZhbWlseTogdmFyKC0tdGV4dC1mb250LWZhbWlseSk7XG5cdGZvbnQtc2l6ZTogdmFyKC0tdGV4dC1mb250LXNpemUtYmFzZSk7XG59XG4uY29udGFpbmVyIHtcblx0XHRkaXNwbGF5OiBmbGV4O1xuXHR9XG4uaHNwYWNlIHtcblx0XHR3aWR0aDogdmFyKC0tc2l6ZS1iYXNlKTtcblx0fVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD1zcmMvRGF0ZVJhbmdlSW5wdXQuc3ZlbHRlLm1hcCAqLzwvc3R5bGU+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBa0tBLEtBQUssZ0JBQUUsS0FBSyxBQUFDLENBQUMsQUFDYixjQUFjLENBQUUsTUFBTSxDQUN0QixXQUFXLENBQUUsTUFBTSxDQUNuQixXQUFXLENBQUUsSUFBSSxDQUNqQixhQUFhLENBQUUsSUFBSSxDQUVuQixjQUFjLENBQUUsR0FBRyxDQUNuQixlQUFlLENBQUUsbUJBQW1CLENBRXBDLHNCQUFzQixDQUFFLGdCQUFnQixDQUV4QyxnQkFBZ0IsQ0FBRSxPQUFPLEFBQzFCLENBQUMsQUFDRCxLQUFLLGdCQUFFLEtBQUssQUFBQyxDQUFDLEFBQ2Isc0JBQXNCLENBQUUsNEJBQTRCLENBQ3BELHFCQUFxQixDQUFFLGdCQUFnQixDQUN2QyxrQkFBa0IsQ0FBRSxrQkFBa0IsQ0FDdEMsdUJBQXVCLENBQUUsR0FBRyxDQUM1Qix1QkFBdUIsQ0FBRSxHQUFHLEFBQzdCLENBQUMsQUFDRCxlQUFFLENBQUMsQUFDRixVQUFVLENBQUUsVUFBVSxBQUN2QixDQUFDLGVBQ0ssS0FBSyxBQUFDLENBQUMsQUFDWixTQUFTLENBQUUsSUFBSSxDQUNmLFdBQVcsQ0FBRSxHQUFHLEFBQ2pCLENBQUMsZUFDSyxLQUFLLEFBQUMsQ0FBQyxBQUNaLFdBQVcsQ0FBRSxJQUFJLGtCQUFrQixDQUFDLENBQ3BDLFNBQVMsQ0FBRSxJQUFJLHFCQUFxQixDQUFDLEFBQ3RDLENBQUMsQUFDRCxVQUFVLGVBQUMsQ0FBQyxBQUNWLE9BQU8sQ0FBRSxJQUFJLEFBQ2QsQ0FBQyxBQUNGLE9BQU8sZUFBQyxDQUFDLEFBQ1AsS0FBSyxDQUFFLElBQUksV0FBVyxDQUFDLEFBQ3hCLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    function create_fragment$1(ctx) {
    	let div;
    	let updating_visibleMonth;
    	let t0;
    	let span;
    	let t1;
    	let updating_visibleMonth_1;
    	let current;
    	let dispose;

    	function month0_visibleMonth_binding(value) {
    		/*month0_visibleMonth_binding*/ ctx[18].call(null, value);
    	}

    	let month0_props = {
    		start: /*displayRange*/ ctx[5].start,
    		end: /*displayRange*/ ctx[5].end
    	};

    	if (/*visibleStartMonth*/ ctx[0] !== void 0) {
    		month0_props.visibleMonth = /*visibleStartMonth*/ ctx[0];
    	}

    	const month0 = new Month({ props: month0_props, $$inline: true });
    	binding_callbacks.push(() => bind(month0, "visibleMonth", month0_visibleMonth_binding));

    	month0.$on("mousedownDate", function () {
    		/*mousedownDate_handler*/ ctx[19].apply(this, arguments);
    	});

    	month0.$on("mouseoverDate", /*onMouseoverDate*/ ctx[7]);
    	month0.$on("mouseupDate", /*onMouseupDate*/ ctx[8]);
    	month0.$on("daySelected", /*onStartDaySelected*/ ctx[9]);

    	function month1_visibleMonth_binding(value_1) {
    		/*month1_visibleMonth_binding*/ ctx[20].call(null, value_1);
    	}

    	let month1_props = {
    		start: /*displayRange*/ ctx[5].start,
    		end: /*displayRange*/ ctx[5].end
    	};

    	if (/*visibleEndMonth*/ ctx[1] !== void 0) {
    		month1_props.visibleMonth = /*visibleEndMonth*/ ctx[1];
    	}

    	const month1 = new Month({ props: month1_props, $$inline: true });
    	binding_callbacks.push(() => bind(month1, "visibleMonth", month1_visibleMonth_binding));

    	month1.$on("mousedownDate", function () {
    		/*mousedownDate_handler_1*/ ctx[21].apply(this, arguments);
    	});

    	month1.$on("mouseoverDate", /*onMouseoverDate*/ ctx[7]);
    	month1.$on("mouseupDate", /*onMouseupDate*/ ctx[8]);
    	month1.$on("daySelected", /*onEndDaySelected*/ ctx[10]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(month0.$$.fragment);
    			t0 = space();
    			span = element("span");
    			t1 = space();
    			create_component(month1.$$.fragment);
    			attr_dev(span, "class", "hspace svelte-1ap5jmo");
    			add_location(span, file$1, 147, 1, 3080);
    			attr_dev(div, "class", "container svelte-1ap5jmo");
    			add_location(div, file$1, 135, 0, 2751);
    			dispose = listen_dev(window, "mouseup", /*clearAnyMouseDown*/ ctx[6], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(month0, div, null);
    			append_dev(div, t0);
    			append_dev(div, span);
    			append_dev(div, t1);
    			mount_component(month1, div, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const month0_changes = {};
    			if (dirty[0] & /*displayRange*/ 32) month0_changes.start = /*displayRange*/ ctx[5].start;
    			if (dirty[0] & /*displayRange*/ 32) month0_changes.end = /*displayRange*/ ctx[5].end;

    			if (!updating_visibleMonth && dirty[0] & /*visibleStartMonth*/ 1) {
    				updating_visibleMonth = true;
    				month0_changes.visibleMonth = /*visibleStartMonth*/ ctx[0];
    				add_flush_callback(() => updating_visibleMonth = false);
    			}

    			month0.$set(month0_changes);
    			const month1_changes = {};
    			if (dirty[0] & /*displayRange*/ 32) month1_changes.start = /*displayRange*/ ctx[5].start;
    			if (dirty[0] & /*displayRange*/ 32) month1_changes.end = /*displayRange*/ ctx[5].end;

    			if (!updating_visibleMonth_1 && dirty[0] & /*visibleEndMonth*/ 2) {
    				updating_visibleMonth_1 = true;
    				month1_changes.visibleMonth = /*visibleEndMonth*/ ctx[1];
    				add_flush_callback(() => updating_visibleMonth_1 = false);
    			}

    			month1.$set(month1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(month0.$$.fragment, local);
    			transition_in(month1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(month0.$$.fragment, local);
    			transition_out(month1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(month0);
    			destroy_component(month1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { start = { year: 2020, month: 1, day: 15 } } = $$props;
    	let { end = { year: 2020, month: 2, day: 15 } } = $$props;
    	let userSelectedStart = null;
    	let userSelectedEnd = null;
    	let startMouseDown = null;
    	let endMouseDown = null;
    	let mouseoverDate = null;
    	let { visibleStartMonth = { year: start.year, month: start.month } } = $$props;
    	let { visibleEndMonth = { year: end.year, month: end.month } } = $$props;

    	const datesAsRange = (dateA, dateB) => {
    		if (dateLte(dateA, dateB)) {
    			return { start: dateA, end: dateB };
    		} else {
    			return { start: dateB, end: dateA };
    		}
    	};

    	const getDisplayRange = ({ start, end, startMouseDown, endMouseDown, mouseoverDate }) => {
    		if (startMouseDown) {
    			start = startMouseDown;

    			if (mouseoverDate && !datesMatch(mouseoverDate, start)) {
    				end = mouseoverDate;
    			}
    		} else if (endMouseDown) {
    			end = endMouseDown;

    			if (mouseoverDate && !datesMatch(mouseoverDate, end)) {
    				start = mouseoverDate;
    			}
    		}

    		return datesAsRange(start, end);
    	};

    	const clearAnyMouseDown = () => {
    		$$invalidate(2, startMouseDown = $$invalidate(3, endMouseDown = null));
    	};

    	const onMouseoverDate = ({ detail: date }) => {
    		if (startMouseDown || endMouseDown) {
    			$$invalidate(4, mouseoverDate = date);
    		}
    	};

    	const onMouseupDate = ({ detail: date }) => {
    		const mouseWasDown = startMouseDown || endMouseDown;
    		const wasAClickOnStart = startMouseDown && datesMatch(date, startMouseDown);
    		const wasAClickOnEnd = endMouseDown && datesMatch(date, endMouseDown);

    		if (mouseWasDown && !wasAClickOnStart && !wasAClickOnEnd) {
    			$$invalidate(13, userSelectedStart = displayRange.start);
    			$$invalidate(14, userSelectedEnd = displayRange.end);
    		}
    	};

    	const onStartDaySelected = ({ detail: date }) => {
    		clearAnyMouseDown();

    		if (dateGt(date, end)) {
    			$$invalidate(13, userSelectedStart = end);
    			$$invalidate(14, userSelectedEnd = date);
    		} else if (!datesMatch(date, start)) {
    			$$invalidate(13, userSelectedStart = date);
    		}
    	};

    	const onEndDaySelected = ({ detail: date }) => {
    		clearAnyMouseDown();

    		if (dateLt(date, start)) {
    			$$invalidate(14, userSelectedEnd = start);
    			$$invalidate(13, userSelectedStart = date);
    		} else if (!datesMatch(date, end)) {
    			$$invalidate(14, userSelectedEnd = date);
    		}
    	};

    	const writable_props = ["start", "end", "visibleStartMonth", "visibleEndMonth"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DateRangeInput> was created with unknown prop '${key}'`);
    	});

    	function month0_visibleMonth_binding(value) {
    		visibleStartMonth = value;
    		$$invalidate(0, visibleStartMonth);
    	}

    	const mousedownDate_handler = ({ detail: date }) => $$invalidate(4, mouseoverDate = $$invalidate(2, startMouseDown = date));

    	function month1_visibleMonth_binding(value_1) {
    		visibleEndMonth = value_1;
    		$$invalidate(1, visibleEndMonth);
    	}

    	const mousedownDate_handler_1 = ({ detail: date }) => $$invalidate(4, mouseoverDate = $$invalidate(3, endMouseDown = date));

    	$$self.$set = $$props => {
    		if ("start" in $$props) $$invalidate(11, start = $$props.start);
    		if ("end" in $$props) $$invalidate(12, end = $$props.end);
    		if ("visibleStartMonth" in $$props) $$invalidate(0, visibleStartMonth = $$props.visibleStartMonth);
    		if ("visibleEndMonth" in $$props) $$invalidate(1, visibleEndMonth = $$props.visibleEndMonth);
    	};

    	$$self.$capture_state = () => {
    		return {
    			start,
    			end,
    			userSelectedStart,
    			userSelectedEnd,
    			startMouseDown,
    			endMouseDown,
    			mouseoverDate,
    			visibleStartMonth,
    			visibleEndMonth,
    			displayRange
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("start" in $$props) $$invalidate(11, start = $$props.start);
    		if ("end" in $$props) $$invalidate(12, end = $$props.end);
    		if ("userSelectedStart" in $$props) $$invalidate(13, userSelectedStart = $$props.userSelectedStart);
    		if ("userSelectedEnd" in $$props) $$invalidate(14, userSelectedEnd = $$props.userSelectedEnd);
    		if ("startMouseDown" in $$props) $$invalidate(2, startMouseDown = $$props.startMouseDown);
    		if ("endMouseDown" in $$props) $$invalidate(3, endMouseDown = $$props.endMouseDown);
    		if ("mouseoverDate" in $$props) $$invalidate(4, mouseoverDate = $$props.mouseoverDate);
    		if ("visibleStartMonth" in $$props) $$invalidate(0, visibleStartMonth = $$props.visibleStartMonth);
    		if ("visibleEndMonth" in $$props) $$invalidate(1, visibleEndMonth = $$props.visibleEndMonth);
    		if ("displayRange" in $$props) $$invalidate(5, displayRange = $$props.displayRange);
    	};

    	let displayRange;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*userSelectedStart, userSelectedEnd, start, end*/ 30720) {
    			 {
    				if (userSelectedStart || userSelectedEnd) {
    					if (userSelectedStart) {
    						$$invalidate(11, start = userSelectedStart);
    						$$invalidate(13, userSelectedStart = null);
    					}

    					if (userSelectedEnd) {
    						$$invalidate(12, end = userSelectedEnd);
    						$$invalidate(14, userSelectedEnd = null);
    					}

    					dispatch("change", { start, end });
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*start, end, startMouseDown, endMouseDown, mouseoverDate*/ 6172) {
    			 $$invalidate(5, displayRange = getDisplayRange({
    				start,
    				end,
    				startMouseDown,
    				endMouseDown,
    				mouseoverDate
    			}));
    		}
    	};

    	return [
    		visibleStartMonth,
    		visibleEndMonth,
    		startMouseDown,
    		endMouseDown,
    		mouseoverDate,
    		displayRange,
    		clearAnyMouseDown,
    		onMouseoverDate,
    		onMouseupDate,
    		onStartDaySelected,
    		onEndDaySelected,
    		start,
    		end,
    		userSelectedStart,
    		userSelectedEnd,
    		dispatch,
    		datesAsRange,
    		getDisplayRange,
    		month0_visibleMonth_binding,
    		mousedownDate_handler,
    		month1_visibleMonth_binding,
    		mousedownDate_handler_1
    	];
    }

    class DateRangeInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1ap5jmo-style")) add_css$1();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			start: 11,
    			end: 12,
    			visibleStartMonth: 0,
    			visibleEndMonth: 1
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DateRangeInput",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get start() {
    		throw new Error("<DateRangeInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set start(value) {
    		throw new Error("<DateRangeInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get end() {
    		throw new Error("<DateRangeInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set end(value) {
    		throw new Error("<DateRangeInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get visibleStartMonth() {
    		throw new Error("<DateRangeInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set visibleStartMonth(value) {
    		throw new Error("<DateRangeInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get visibleEndMonth() {
    		throw new Error("<DateRangeInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set visibleEndMonth(value) {
    		throw new Error("<DateRangeInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/TestApp.svelte generated by Svelte v3.16.4 */
    const file$2 = "src/TestApp.svelte";

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-pdy2ve-style";
    	style.textContent = ".page.svelte-pdy2ve{padding:16px}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGVzdEFwcC5zdmVsdGUiLCJzb3VyY2VzIjpbIlRlc3RBcHAuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJ0ZXN0LWFwcFwiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCBEYXRlUmFuZ2VJbnB1dCBmcm9tICcuL0RhdGVSYW5nZUlucHV0LnN2ZWx0ZSdcblxuXHRjb25zdCBwYWQyID0gbnVtYmVyID0+IG51bWJlci50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJylcblx0Y29uc3QgdG9Jc29EYXRlID0gZGF0ZSA9PiBgJHtkYXRlLnllYXJ9LSR7cGFkMihkYXRlLm1vbnRoKX0tJHtwYWQyKGRhdGUuZGF5KX1gXG5cblx0bGV0IGNoYW5nZXMgPSBbXVxuXG5cdGxldCBzdGFydCA9IHsgeWVhcjogMjAyMCwgbW9udGg6IDEsIGRheTogMTAgfVxuXHRsZXQgZW5kID0geyB5ZWFyOiAyMDIwLCBtb250aDogMSwgZGF5OiAyMCB9XG5cblx0bGV0IHZpc2libGVTdGFydE1vbnRoID0geyB5ZWFyOiAyMDIwLCBtb250aDogMSB9XG5cdGxldCB2aXNpYmxlRW5kTW9udGggPSB7IHllYXI6IDIwMjAsIG1vbnRoOiAyIH1cblxuXHRjb25zdCBjaGFuZ2VEYXRlID0gKCkgPT4ge1xuXHRcdHZpc2libGVTdGFydE1vbnRoID0gc3RhcnQgPSB7IHllYXI6IDIwMTksIG1vbnRoOiAxLCBkYXk6IDEwIH1cblx0XHR2aXNpYmxlRW5kTW9udGggPSBlbmQgPSB7IHllYXI6IDIwMTksIG1vbnRoOiAyLCBkYXk6IDIwIH1cblx0fVxuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cblx0LnBhZ2Uge1xuXHRcdHBhZGRpbmc6IDE2cHg7XG5cdH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9c3JjL1Rlc3RBcHAuc3ZlbHRlLm1hcCAqLzwvc3R5bGU+XG5cbjxkaXYgY2xhc3M9XCJwYWdlXCI+XG5cdDxidXR0b24gb246Y2xpY2s9e2NoYW5nZURhdGV9Pk1hbnVhbGx5IGNvbnRyb2wgdGhlIGRhdGUgZnJvbSB0aGUgb3V0c2lkZTwvYnV0dG9uPlxuXHQ8RGF0ZVJhbmdlSW5wdXRcblx0XHRiaW5kOnN0YXJ0XG5cdFx0YmluZDplbmRcblx0XHR7dmlzaWJsZVN0YXJ0TW9udGh9XG5cdFx0e3Zpc2libGVFbmRNb250aH1cblx0XHRvbjpjaGFuZ2U9eyAoeyBkZXRhaWw6IHJhbmdlIH0pID0+IGNoYW5nZXMgPSBbLi4uY2hhbmdlcywgcmFuZ2VdIH1cblx0PlxuXHQ8L0RhdGVSYW5nZUlucHV0PlxuXHQ8aHI+XG5cdDxsYWJlbD5cblx0XHRDaGFuZ2VzXG5cdFx0PG9sPlxuXHRcdFx0eyNlYWNoIGNoYW5nZXMgYXMgY2hhbmdlfVxuXHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0Q2hhbmdlZCB0byBzdGFydDoge3RvSXNvRGF0ZShjaGFuZ2Uuc3RhcnQpfSwgZW5kOiB7dG9Jc29EYXRlKGNoYW5nZS5lbmQpfVxuXHRcdFx0XHQ8L2xpPlxuXHRcdFx0ey9lYWNofVxuXHRcdDwvb2w+XG5cdDwvbGFiZWw+XG48L2Rpdj5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUF1QkMsS0FBSyxjQUFDLENBQUMsQUFDTixPQUFPLENBQUUsSUFBSSxBQUNkLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (32:1) <DateRangeInput   bind:start   bind:end   {visibleStartMonth}   {visibleEndMonth}   on:change={ ({ detail: range }) => changes = [...changes, range] }  >
    function create_default_slot(ctx) {
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(32:1) <DateRangeInput   bind:start   bind:end   {visibleStartMonth}   {visibleEndMonth}   on:change={ ({ detail: range }) => changes = [...changes, range] }  >",
    		ctx
    	});

    	return block;
    }

    // (44:3) {#each changes as change}
    function create_each_block$1(ctx) {
    	let li;
    	let t0;
    	let t1_value = /*toIsoDate*/ ctx[5](/*change*/ ctx[11].start) + "";
    	let t1;
    	let t2;
    	let t3_value = /*toIsoDate*/ ctx[5](/*change*/ ctx[11].end) + "";
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text("Changed to start: ");
    			t1 = text(t1_value);
    			t2 = text(", end: ");
    			t3 = text(t3_value);
    			t4 = space();
    			add_location(li, file$2, 44, 4, 1066);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    			append_dev(li, t3);
    			append_dev(li, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*changes*/ 1 && t1_value !== (t1_value = /*toIsoDate*/ ctx[5](/*change*/ ctx[11].start) + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*changes*/ 1 && t3_value !== (t3_value = /*toIsoDate*/ ctx[5](/*change*/ ctx[11].end) + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(44:3) {#each changes as change}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let button;
    	let t1;
    	let updating_start;
    	let updating_end;
    	let t2;
    	let hr;
    	let t3;
    	let label;
    	let t4;
    	let ol;
    	let current;
    	let dispose;

    	function daterangeinput_start_binding(value) {
    		/*daterangeinput_start_binding*/ ctx[8].call(null, value);
    	}

    	function daterangeinput_end_binding(value_1) {
    		/*daterangeinput_end_binding*/ ctx[9].call(null, value_1);
    	}

    	let daterangeinput_props = {
    		visibleStartMonth: /*visibleStartMonth*/ ctx[3],
    		visibleEndMonth: /*visibleEndMonth*/ ctx[4],
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*start*/ ctx[1] !== void 0) {
    		daterangeinput_props.start = /*start*/ ctx[1];
    	}

    	if (/*end*/ ctx[2] !== void 0) {
    		daterangeinput_props.end = /*end*/ ctx[2];
    	}

    	const daterangeinput = new DateRangeInput({
    			props: daterangeinput_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(daterangeinput, "start", daterangeinput_start_binding));
    	binding_callbacks.push(() => bind(daterangeinput, "end", daterangeinput_end_binding));

    	daterangeinput.$on("change", function () {
    		/*change_handler*/ ctx[10].apply(this, arguments);
    	});

    	let each_value = /*changes*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "Manually control the date from the outside";
    			t1 = space();
    			create_component(daterangeinput.$$.fragment);
    			t2 = space();
    			hr = element("hr");
    			t3 = space();
    			label = element("label");
    			t4 = text("Changes\n\t\t");
    			ol = element("ol");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(button, file$2, 30, 1, 745);
    			add_location(hr, file$2, 39, 1, 1002);
    			add_location(ol, file$2, 42, 2, 1028);
    			add_location(label, file$2, 40, 1, 1008);
    			attr_dev(div, "class", "page svelte-pdy2ve");
    			add_location(div, file$2, 29, 0, 725);
    			dispose = listen_dev(button, "click", /*changeDate*/ ctx[6], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(div, t1);
    			mount_component(daterangeinput, div, null);
    			append_dev(div, t2);
    			append_dev(div, hr);
    			append_dev(div, t3);
    			append_dev(div, label);
    			append_dev(label, t4);
    			append_dev(label, ol);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ol, null);
    			}

    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const daterangeinput_changes = {};
    			if (dirty[0] & /*visibleStartMonth*/ 8) daterangeinput_changes.visibleStartMonth = /*visibleStartMonth*/ ctx[3];
    			if (dirty[0] & /*visibleEndMonth*/ 16) daterangeinput_changes.visibleEndMonth = /*visibleEndMonth*/ ctx[4];

    			if (dirty[0] & /*$$scope*/ 16384) {
    				daterangeinput_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_start && dirty[0] & /*start*/ 2) {
    				updating_start = true;
    				daterangeinput_changes.start = /*start*/ ctx[1];
    				add_flush_callback(() => updating_start = false);
    			}

    			if (!updating_end && dirty[0] & /*end*/ 4) {
    				updating_end = true;
    				daterangeinput_changes.end = /*end*/ ctx[2];
    				add_flush_callback(() => updating_end = false);
    			}

    			daterangeinput.$set(daterangeinput_changes);

    			if (dirty[0] & /*toIsoDate, changes*/ 33) {
    				each_value = /*changes*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ol, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(daterangeinput.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(daterangeinput.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(daterangeinput);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	const pad2 = number => number.toString().padStart(2, "0");
    	const toIsoDate = date => `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
    	let changes = [];
    	let start = { year: 2020, month: 1, day: 10 };
    	let end = { year: 2020, month: 1, day: 20 };
    	let visibleStartMonth = { year: 2020, month: 1 };
    	let visibleEndMonth = { year: 2020, month: 2 };

    	const changeDate = () => {
    		$$invalidate(3, visibleStartMonth = $$invalidate(1, start = { year: 2019, month: 1, day: 10 }));
    		$$invalidate(4, visibleEndMonth = $$invalidate(2, end = { year: 2019, month: 2, day: 20 }));
    	};

    	function daterangeinput_start_binding(value) {
    		start = value;
    		$$invalidate(1, start);
    	}

    	function daterangeinput_end_binding(value_1) {
    		end = value_1;
    		$$invalidate(2, end);
    	}

    	const change_handler = ({ detail: range }) => $$invalidate(0, changes = [...changes, range]);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("changes" in $$props) $$invalidate(0, changes = $$props.changes);
    		if ("start" in $$props) $$invalidate(1, start = $$props.start);
    		if ("end" in $$props) $$invalidate(2, end = $$props.end);
    		if ("visibleStartMonth" in $$props) $$invalidate(3, visibleStartMonth = $$props.visibleStartMonth);
    		if ("visibleEndMonth" in $$props) $$invalidate(4, visibleEndMonth = $$props.visibleEndMonth);
    	};

    	return [
    		changes,
    		start,
    		end,
    		visibleStartMonth,
    		visibleEndMonth,
    		toIsoDate,
    		changeDate,
    		pad2,
    		daterangeinput_start_binding,
    		daterangeinput_end_binding,
    		change_handler
    	];
    }

    class TestApp extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-pdy2ve-style")) add_css$2();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TestApp",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new TestApp({
    	target: document.getElementById("test-app-target"),
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
