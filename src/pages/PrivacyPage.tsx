import { Link } from "react-router-dom";
import { LEGAL } from "../lib/legal";
import { Page } from "../components/ui";

export default function PrivacyPage() {
  return (
    <Page>
      <h1>Informativa privacy</h1>
      <p className="muted">Ultimo aggiornamento: {LEGAL.updated}. Versione beta, scritta in modo semplice.</p>

      <h2>Chi tratta i tuoi dati</h2>
      <p>Il titolare è <strong>{LEGAL.owner}</strong>, {LEGAL.address}. Per qualsiasi richiesta sui tuoi dati scrivi a <strong>{LEGAL.email}</strong>.</p>

      <h2>Cosa resta solo sul tuo dispositivo</h2>
      <p>Targhe, numeri di telaio, budget, spese, bozze e inventario dei ricambi che non pubblichi restano nel tuo browser e <strong>non vengono mai inviati ai nostri server</strong>. Se cancelli i dati del sito o cambi dispositivo, li perdi: usa l'esportazione del backup. Non usiamo cookie di profilazione né strumenti di analisi del traffico. Nel browser salviamo solo il necessario per tenerti collegato.</p>

      <h2>Quali dati raccogliamo e perché</h2>
      <div className="card stack">
        <div><strong>Account:</strong> l'indirizzo email, con cui accedi con un link monouso o con Google. Serve a fornirti il servizio (art. 6.1.b GDPR).</div>
        <div><strong>Profilo pubblico:</strong> nome utente, nome visibile, comune, posizione generalizzata a circa 1 km (mai l'indirizzo esatto) e bio. Sono visibili a tutti.</div>
        <div><strong>Contenuti che pubblichi:</strong> pezzi da parte, diari di restauro, storie in evidenza e recensioni. Le foto vengono ridimensionate e private dei dati di posizione (EXIF). Sono visibili secondo le opzioni che scegli.</div>
        <div><strong>Messaggi di contatto:</strong> li legge il venditore a cui scrivi. Se il profilo non è ancora stato riscattato, li legge anche il nostro team, che li inoltra a mano al venditore.</div>
        <div><strong>Segnalazioni:</strong> motivo, dettagli e chi ha segnalato, per gestire la moderazione (legittimo interesse, art. 6.1.f).</div>
        <div><strong>Dati tecnici:</strong> indirizzo IP e registri del server, per sicurezza e per limitare gli abusi, ad esempio le troppe richieste di accesso (legittimo interesse).</div>
        <div><strong>Consenso:</strong> quando crei o riscatti il profilo registriamo la data e la versione di termini e informativa che hai accettato.</div>
      </div>

      <h2>Accesso con Google</h2>
      <p>Se scegli “Continua con Google” riceviamo da Google il tuo indirizzo email verificato, non la password né altri dati. Per mostrare il pulsante la pagina di accesso carica uno script di Google, che può ricevere il tuo indirizzo IP e informazioni sul dispositivo secondo la <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">sua informativa</a>. Puoi evitarlo accedendo con il link via email.</p>

      <h2>A chi affidiamo i dati</h2>
      <ul>
        <li><strong>Render:</strong> ospita il sito e il server (Francoforte).</li>
        <li><strong>Neon:</strong> database con i dati pubblicati.</li>
        <li><strong>Cloudflare (R2):</strong> conserva le foto pubblicate.</li>
        <li><strong>Resend:</strong> invia le email di accesso e di servizio.</li>
        <li><strong>Google:</strong> accesso con Google.</li>
        <li><strong>OpenStreetMap:</strong> fornisce le tessere della mappa; ricevono il tuo indirizzo IP quando guardi la mappa.</li>
      </ul>
      <p>Alcuni fornitori possono trattare dati anche fuori dallo Spazio economico europeo, in particolare negli Stati Uniti, sulla base delle garanzie previste dal GDPR (decisione di adeguatezza o clausole contrattuali standard). Non vendiamo i tuoi dati e non li usiamo per pubblicità.</p>

      <h2>Per quanto tempo</h2>
      <ul>
        <li>Fino a quando non elimini l'account. Dal profilo puoi eliminarlo in qualsiasi momento: profilo, pezzi, diari, storie, foto, messaggi e recensioni vengono cancellati dal server.</li>
        <li>I link di accesso scadono dopo 15 minuti e si usano una volta sola.</li>
        <li>Le segnalazioni restano archiviate senza il collegamento al tuo profilo.</li>
        <li>Copie di sicurezza e registri tecnici si cancellano da soli entro il periodo previsto dai fornitori, in genere non oltre 30 giorni.</li>
      </ul>

      <h2>I tuoi diritti</h2>
      <p>Puoi chiedere accesso, correzione, cancellazione, limitazione, portabilità dei dati e opporti a un trattamento scrivendo a {LEGAL.email}; rispondiamo entro 30 giorni. La cancellazione la fai anche da solo dal profilo. Se pensi che i tuoi dati non siano trattati correttamente puoi rivolgerti al <a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer">Garante per la protezione dei dati personali</a>.</p>

      <h2>Se un profilo è stato creato per te</h2>
      <p>Durante la beta il nostro team può creare il profilo di un venditore con i suoi annunci, dopo aver ricevuto il suo consenso. I dati vengono da te o da annunci che hai condiviso. Il profilo risulta “non riscattato” finché non lo prendi in carico con il link personale (valido 30 giorni). Puoi modificarlo, nasconderlo o chiedere di toglierlo quando vuoi: lo rimuoviamo entro 2 giorni lavorativi.</p>

      <h2>Età minima</h2>
      <p>Il servizio è riservato a maggiorenni.</p>

      <h2>Modifiche</h2>
      <p>Se cambiamo questa informativa aggiorniamo la data in alto e, per le modifiche importanti, ti avvisiamo. Vedi anche i <Link to="/termini">termini d'uso</Link>.</p>
    </Page>
  );
}
