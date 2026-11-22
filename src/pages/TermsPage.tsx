import { Link } from "react-router-dom";
import { LEGAL } from "../lib/legal";
import { Page } from "../components/ui";

export default function TermsPage() {
  return (
    <Page>
      <h1>Termini d'uso</h1>
      <p className="muted">Ultimo aggiornamento: {LEGAL.updated}. Versione beta.</p>

      <h2>Che cos'è Vicini di Box</h2>
      <p>Vicini di Box è una community per appassionati di auto d'epoca: una mappa di ricambi da parte e diari di restauro. Il servizio è gestito da <strong>{LEGAL.owner}</strong> ({LEGAL.address}, {LEGAL.email}). È in versione beta: può cambiare, avere interruzioni o errori.</p>

      <h2>Chi può usarlo</h2>
      <p>Serve essere maggiorenni e accedere con un indirizzo email tuo. Sei responsabile di quello che pubblichi con il tuo account.</p>

      <h2>Regole</h2>
      <ul>
        <li>Niente pezzi rubati, contraffatti o venduti senza averne diritto.</li>
        <li>Niente insulti, minacce, spam o contenuti ingannevoli.</li>
        <li>Niente dati personali di altre persone (targhe, indirizzi, telefoni) senza il loro permesso.</li>
        <li>Pubblica solo foto e testi tuoi o di cui hai il permesso.</li>
        <li>Le recensioni sono possibili solo dopo aver contattato il venditore e devono raccontare un'esperienza vera.</li>
      </ul>

      <h2>I tuoi contenuti</h2>
      <p>I contenuti restano tuoi. Pubblicandoli ci autorizzi a mostrarli nell'app secondo le opzioni di visibilità che scegli, per tutto il tempo in cui restano pubblicati. Puoi nasconderli o eliminarli quando vuoi.</p>

      <h2>Segnalazioni e moderazione</h2>
      <p>Chiunque può segnalare un contenuto dal menu ⋯. Esaminiamo le segnalazioni e possiamo rimuovere contenuti o sospendere account che violano queste regole. Se un tuo contenuto viene rimosso puoi scrivere a {LEGAL.email} per contestarlo.</p>

      <h2>Scambi tra utenti</h2>
      <p>Vicini di Box mette in contatto le persone ma non è parte degli scambi: non vende i pezzi, non gestisce pagamenti e non garantisce l'autenticità, la qualità o la disponibilità di ciò che viene offerto. Accordi, pagamenti e ritiri avvengono tra le persone; verifica sempre il pezzo prima di pagare.</p>

      <h2>Responsabilità</h2>
      <p>Nei limiti consentiti dalla legge, non rispondiamo di danni dovuti a interruzioni del servizio, perdita dei dati salvati solo nel tuo browser o rapporti tra utenti. Questo non limita i diritti che la legge ti riconosce come consumatore.</p>

      <h2>Chiudere l'account</h2>
      <p>Puoi eliminare l'account dal profilo in qualsiasi momento. Possiamo sospenderlo se violi le regole o per motivi di sicurezza.</p>

      <h2>Legge applicabile</h2>
      <p>Si applica la legge italiana. Per i consumatori resta valido il foro di residenza o domicilio.</p>

      <p>Trattiamo i tuoi dati come spiegato nell'<Link to="/privacy">informativa privacy</Link>.</p>
    </Page>
  );
}
