# date-range-input

A user interface for inputting date ranges.

**[Demo](https://equipmentshare.github.io/date-range-input/)**

<img src="./demo.gif" width="425.5px" height="202px">

## Install

```sh
npm i @equipmentshare/date-range-input
```

## How to use

The date range input takes these properties.

`start` and `end` are required.  They must be an object with these numeric properties: `year`, `month`, and `day`.

`visibleStartMonth` and `visibleEndMonth` are optional, for if you want to manually specify which month should be displayed in each calendar.  They are an object with the numeric properties `year` and `month`.

The component emits a `change` event with a `detail` property that is an object with `start` and `end` properties.  Both dates are objects with `year`/`month`/`day` properties.

### As vanilla JS

```js
import DateRangeInput from '@equipmentshare/date-range-input'

const dateRangeInput = new DateRangeInput({
	target: document.querySelector('div.date-range-input'),
	props: {
		start: {
			year: 2020,
			month: 1,
			day: 5,
		},
		end: {
			year: 2020,
			month: 1,
			day: 18,
		},
		visibleEndMonth: {
			year: 2020,
			month: 2
		}
	}
})

dateRangeInput.$on('change', event => console.log(event.detail))
```

### As a Svelte component

```html
<script>
import DateRangeInput from '@equipmentshare/date-range-input'
</script>

<DateRangeInput
	start={ { year: 2020, month: 1, day: 10 } }
	end={ { year: 2020, month: 1, day: 20 } }
	visibleEndMonth={ { year: 2020, month: 2 } }
	on:change={ event => console.log(event.detail) }
>
</DateRangeInput>

```

## How to test/develop

```sh
npm run dev
```

Edit `src/TestApp.svelte` to play with the component.

## To consider

A couple folks have said that they expected different behavior when they started a click-and-drag on an existing end-point.

If this continues, we may want to experiment with different behavior when a drag starts on a current end-point – probably making it drag that end-point around, as opposed to the normal behavior of starting a new range selection
