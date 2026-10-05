const L={'Moto':'Motorbike','Bakkie':'Bakkie / Pickup','Van':'Panel Van','4-Ton':'4-Ton Truck','8-Ton':'8-Ton Flatbed'}
export function vehicleLabel(n){return n?(L[n]||n):'—'}
