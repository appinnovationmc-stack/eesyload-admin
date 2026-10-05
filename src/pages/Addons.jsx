import AddonsPanel from '../components/AddonsPanel'

export default function Addons() {
  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Add-ons</h1>
          <p>Extras riders can toggle at booking (helpers, insurance, etc). Changes go live immediately — the fare function and the rider app both read the <span className="mono">service_addons</span> table.</p>
        </div>
      </header>
      <AddonsPanel />
    </div>
  )
}
