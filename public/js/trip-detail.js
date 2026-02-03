/**
 * 旅行プラン削除時の確認ダイアログ
 */
function confirmDelete() {
    return confirm('この旅行プランを削除してもよろしいですか？（この操作は取り消せません）');
}

/**
 * Google Maps 初期化関数
 */
window.initMap = function() {
    console.log("Google Maps API Callback: initMap started"); // デバッグ用ログ
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error("Map container (#map) not found");
        return;
    }

    const dataElement = document.getElementById('spots-data');
    let spots = [];
    if (dataElement) {
        try {
            spots = JSON.parse(dataElement.getAttribute('data-json'));
            console.log("Parsed spots:", spots); // データの確認
        } catch (e) {
            console.error("JSON parse error:", e);
        }
    }
    
    const map = new google.maps.Map(mapContainer, {
        zoom: 13,
        center: { lat: 35.6812, lng: 139.7671 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
    });

    if (spots.length === 0) {
        console.log("No spots to display on map");
        return;
    }

    const geocoder = new google.maps.Geocoder();
    const bounds = new google.maps.LatLngBounds();
    let processedCount = 0;

    spots.forEach((spot, index) => {
        if (!spot.address) return;

        geocoder.geocode({ address: spot.address }, (results, status) => {
            if (status === 'OK') {
                const location = results[0].geometry.location;
                const marker = new google.maps.Marker({
                    map: map,
                    position: location,
                    label: {
                        text: String(index + 1),
                        color: "white",
                        fontWeight: "bold"
                    },
                    title: spot.name,
                    animation: google.maps.Animation.DROP
                });

                const infoWindow = new google.maps.InfoWindow({
                    content: `<div style="padding: 10px; color: #333;">
                                <h6>${index + 1}. ${spot.name}</h6>
                                <p style="font-size: 12px; margin:0;">${spot.visit_date}<br>${spot.start_time || ''} 〜</p>
                              </div>`
                });

                marker.addListener('click', () => infoWindow.open(map, marker));
                bounds.extend(location);
                
                processedCount++;
                if (processedCount === spots.filter(s => s.address).length) {
                    map.fitBounds(bounds);
                    // ズームしすぎ防止
                    google.maps.event.addListenerOnce(map, 'idle', () => {
                        if (map.getZoom() > 16) map.setZoom(16);
                    });
                }
            } else {
                console.error('Geocoding failed for:', spot.address, status);
            }
        });
    });
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("Trip Detail Page Loaded.");
});