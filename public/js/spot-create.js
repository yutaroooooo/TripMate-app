let map;
let marker;
let autocomplete;

function initMap() {
    // 初期位置
    const addressInput = document.getElementById("addressInput");
    let currentPos = { lat: 35.681236, lng: 139.767125 };

    map = new google.maps.Map(document.getElementById("mapPreview"), {
        center: currentPos,
        zoom: 15,
    });

    // 編集画面用
    if (addressInput && addressInput.value) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: addressInput.value }, (results, status) => {
            if (status === "OK") {
                const pos = results[0].geometry.location;
                map.setCenter(pos);
                marker = new google.maps.Marker({ map: map, position: pos });
            }
        });
    }

    // 2. 現在地取得
    if (navigator.geolocation && (!addressInput || !addressInput.value)) {
        navigator.geolocation.getCurrentPosition((position) => {
            const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
            map.setCenter(pos);
        });
    }

    // 3. 検索窓
    const input = document.getElementById("mapSearchInput");
    autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo("bounds", map);

    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
            window.alert("スポットが見つかりませんでした。");
            return;
        }

        map.setCenter(place.geometry.location);
        if (marker) marker.setMap(null);
        marker = new google.maps.Marker({ map: map, position: place.geometry.location });
        
        // テキスト表示用（新規画面）
        const nameOutput = document.getElementById("spotNameOutput");
        const addrOutput = document.getElementById("addressOutput");
        if (nameOutput) nameOutput.innerText = place.name;
        if (addrOutput) addrOutput.innerText = place.formatted_address;

        // 入力欄用（新規・編集両方）
        const nameInput = document.getElementById("spotNameInput");
        const addrInput = document.getElementById("addressInput");
        if (nameInput) nameInput.value = place.name;
        if (addrInput) addrInput.value = place.formatted_address;
    });
}