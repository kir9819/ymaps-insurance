document.addEventListener('DOMContentLoaded', ready)

function getDefaultPlacemark(item) {
	return {
		id: item.id,
		type: 'Feature',
		geometry: {
			type: 'Point',
			coordinates: item.coordinates,
		},
		properties: {
			item,
			balloonContentBody: [
				`<b>${item.label}</b>
				<div>Адрес: <i>${item.address}</i></div>
				<p>Вид оказываемой помощи: ${item.medicineTypeDescription}</p>
				<div>${item.typeDescription}</div>`,
			],
			hintContent: item.label,
			clusterCaption: item.label,
		},
		options: {
			hideIconOnBalloonOpen: false,
		},
	}
}

let myMap = {}
let objectManager = {}

function ready() {
	ymaps.ready(initMap)

	async function initMap() {
		myMap = new ymaps.Map("map", {
			center: [59.9386, 30.3141],
			zoom: 14,
			controls: ['zoomControl'],
		})

		objectManager = new ymaps.ObjectManager({ clusterize: true, viewportMargin: 0 })

		myMap.geoObjects.add(objectManager)

		// myMap.events.add(['actionend'], onChangeMapPosition)

		setAddressesOnMap(await getItems())
	}
}

// onChangeMapPosition()

async function setAddressesOnMap(items) {
	const features = items.map(getDefaultPlacemark)

	objectManager.add({ type: 'FeatureCollection', features })

	// onChangeMapPosition()
}

async function getItems(addressesCsv) {
	let items = []

	if (addressesCsv) {
		const itemsWithoutCoordinates = getAddresses(addressesCsv).items

		items = await Promise.all(itemsWithoutCoordinates.map(getItemWithCoordinates))
	} else {
		try {
			const cachedItems = JSON.parse(localStorage.getItem('items'))

			if (cachedItems) items = cachedItems
		} catch { }
	}

	localStorage.setItem('items', JSON.stringify(items))

	return items
}

async function getItemWithCoordinates(item) {
	const coordinates = (await ymaps.geocode(item.address, { results: 1 })).geoObjects.get(0)?.geometry.getCoordinates()

	Object.assign(item, { coordinates })

	return item
}

function updateAddresses(input) {
	const file = input.files[0]

	const reader = new FileReader()

	reader.readAsText(file)

	reader.onload = async function () {
		try {
			setAddressesOnMap(await getItems(reader.result))
		} catch (error) {
			console.log(error)
		}
	}
}

const medicineTypes = {
	'П': 'амбулаторная помощь',
	'В': 'помощь на дому',
	'А': 'скорая медицинская помощь',
	'Э': 'экстренная стационарная помощь',
	'Г': 'плановая стационарная помощь',
	'С': 'стоматологическая помощь',
}

function getAddresses(addressesCsv) {
	const addresses = addressesCsv.split('\n')

	const header = { label: 'Название', address: 'Адрес', types: 'Виды помощи' }
	const types = []
	const items = []

	let currentType = -1

	addresses.forEach((addressItem, index) => {
		if (index === 0) return

		const [label, address, medicineType] = addressItem.split(';')

		if (!address && (!medicineType || medicineType.length === 1)) {
			currentType += 1
			types.push(label)
			return
		}

		items.push({
			label,
			address,
			medicineType,
			type: currentType,
			typeDescription: types[currentType],
			medicineTypeDescription: medicineTypes[medicineType],
			id: index,
		})
	})

	return { items, types, header }
}