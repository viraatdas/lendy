// Transactional email templates for Lendy.
//
// These are pure functions that build `{ subject, html }` payloads for the
// Resend API. Because email clients (Gmail, Apple Mail, Outlook) strip
// `<style>` blocks, ignore web fonts, and have spotty support for flexbox /
// grid / box-shadow, every rule here is:
//   - written as an INLINE style attribute,
//   - laid out with nested <table> elements (not flex/grid),
//   - typeset in a web-safe monospace stack to evoke the pixel/retro vibe.
//
// The "pixel card" look is emulated with a bold 3px solid ink border plus a
// small hard-offset shadow block behind the card (nested tables), since
// box-shadow is unreliable in email.

export interface EmailContent {
  subject: string;
  html: string;
}

/* -------------------------------------------------------------------------- */
/* Brand tokens                                                               */
/* -------------------------------------------------------------------------- */

const CREAM = "#fdf6e3";
const INK = "#2d2d2d";
const WHITE = "#ffffff";
const PINK = "#ff6b9d";
const SOFT = "#555555";
const MUTED = "#888888";

// Lendy wordmark letter colours, in order: L e n d y
const WORDMARK_COLORS = ["#ff6b9d", "#7c5cff", "#ffd700", "#4ade80", "#60a5fa"];
const WORDMARK_LETTERS = ["L", "e", "n", "d", "y"];

const MONO = "'Courier New', ui-monospace, 'Cascadia Code', Menlo, monospace";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Escape a user-provided string for safe interpolation into HTML markup.
 * Handles the five significant characters plus double/single quotes so the
 * value is also safe inside attribute contexts.
 */
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The colored, inline-styled Lendy wordmark used in every header. */
function wordmark(): string {
  const letters = WORDMARK_LETTERS.map(
    (letter, i) =>
      `<span style="color:${WORDMARK_COLORS[i]};">${letter}</span>`,
  ).join("");
  return (
    `<span style="font-family:${MONO};font-size:30px;font-weight:bold;` +
    `letter-spacing:2px;">${letters}</span>`
  );
}

/** A pixel-styled anchor button (solid fill, hard ink border, no radius). */
function pixelButton(
  href: string,
  label: string,
  bg: string = PINK,
  color: string = INK,
): string {
  return (
    `<a href="${escapeHtml(href)}" ` +
    `style="display:inline-block;font-family:${MONO};font-size:16px;` +
    `font-weight:bold;color:${color};background-color:${bg};` +
    `text-decoration:none;padding:14px 26px;border:3px solid ${INK};` +
    `border-radius:0;">${escapeHtml(label)}</a>`
  );
}

/**
 * Wrap inner card content in the full email chrome: cream page background,
 * centered white pixel-card with a hard-offset shadow block, header wordmark,
 * and footer. `innerHtml` is already-escaped, trusted markup.
 */
function layout(innerHtml: string): string {
  return `<!--[if mso]><style>* { font-family: 'Courier New', monospace !important; }</style><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CREAM}" style="background-color:${CREAM};margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <!-- hard-offset shadow: an ink block nudged behind the card -->
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
        <tr>
          <td style="padding:0 0 6px 6px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${WHITE}" style="background-color:${WHITE};border:3px solid ${INK};">
              <!-- header -->
              <tr>
                <td align="center" style="padding:28px 32px 8px 32px;border-bottom:3px solid ${INK};">
                  ${wordmark()}
                  <div style="font-family:${MONO};font-size:11px;letter-spacing:3px;color:${MUTED};text-transform:uppercase;padding-top:6px;">Lend books. Make friends.</div>
                </td>
              </tr>
              <!-- body -->
              <tr>
                <td style="padding:28px 32px 32px 32px;">
                  ${innerHtml}
                </td>
              </tr>
              <!-- footer -->
              <tr>
                <td align="center" style="padding:18px 32px;border-top:3px solid ${INK};background-color:${CREAM};">
                  <div style="font-family:${MONO};font-size:12px;color:${MUTED};">Sent with love from Lendy 📚</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/** A heading line styled consistently across templates. */
function heading(text: string): string {
  return (
    `<h1 style="margin:0 0 16px 0;font-family:${MONO};font-size:22px;` +
    `line-height:1.3;font-weight:bold;color:${INK};">${text}</h1>`
  );
}

/** A body paragraph. `html` is trusted (already escaped by caller). */
function paragraph(html: string): string {
  return (
    `<p style="margin:0 0 16px 0;font-family:${MONO};font-size:15px;` +
    `line-height:1.6;color:${SOFT};">${html}</p>`
  );
}

/** Center a CTA button with breathing room. */
function ctaRow(buttonHtml: string): string {
  return `<div style="padding:8px 0 4px 0;">${buttonHtml}</div>`;
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Sent to a book OWNER when someone requests to borrow their book.
 * Shows the cover (or a 📖 placeholder) beside the title, then an
 * "Open Lendy →" CTA.
 */
export function bookRequestEmail(params: {
  ownerUsername: string;
  requesterUsername: string;
  bookTitle: string;
  bookAuthor: string;
  coverUrl?: string | null;
  appUrl: string;
}): EmailContent {
  const owner = escapeHtml(params.ownerUsername);
  const requester = escapeHtml(params.requesterUsername);
  const title = escapeHtml(params.bookTitle);
  const author = escapeHtml(params.bookAuthor);

  const coverCell = params.coverUrl
    ? `<img src="${escapeHtml(params.coverUrl)}" width="72" alt="${title}" ` +
      `style="display:block;width:72px;border:3px solid ${INK};background-color:${CREAM};" />`
    : `<div style="width:72px;height:104px;line-height:104px;text-align:center;` +
      `font-size:34px;border:3px solid ${INK};background-color:${CREAM};">📖</div>`;

  const bookCard =
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin:4px 0 22px 0;background-color:${CREAM};border:3px solid ${INK};width:100%;">` +
    `<tr>` +
    `<td valign="top" style="padding:14px;width:72px;">${coverCell}</td>` +
    `<td valign="middle" style="padding:14px 14px 14px 0;">` +
    `<div style="font-family:${MONO};font-size:16px;font-weight:bold;color:${INK};line-height:1.35;">${title}</div>` +
    `<div style="font-family:${MONO};font-size:13px;color:${SOFT};padding-top:4px;">by ${author}</div>` +
    `</td>` +
    `</tr></table>`;

  const inner =
    heading(`Hey ${owner}, you've got a request! 🙌`) +
    paragraph(
      `<strong style="color:${INK};">${requester}</strong> would love to borrow this book from your shelf:`,
    ) +
    bookCard +
    paragraph(`Head to Lendy to accept or decline the request.`) +
    ctaRow(pixelButton(params.appUrl, "Open Lendy →"));

  return {
    subject: `📚 ${params.requesterUsername} wants to borrow "${params.bookTitle}"`,
    html: layout(inner),
  };
}

/**
 * Sent to a REQUESTER when the owner accepts or declines their request.
 * Accepted emails lead with a celebratory heading and a green accent; declined
 * emails stay warm and encouraging. CTA: "View your library →".
 */
export function requestStatusEmail(params: {
  requesterUsername: string;
  ownerUsername: string;
  bookTitle: string;
  status: "accepted" | "declined";
  appUrl: string;
}): EmailContent {
  const requester = escapeHtml(params.requesterUsername);
  const owner = escapeHtml(params.ownerUsername);
  const title = escapeHtml(params.bookTitle);
  const accepted = params.status === "accepted";

  const badgeColor = accepted ? "#4ade80" : "#ffd700";
  const badgeText = accepted ? "ACCEPTED ✓" : "DECLINED";

  const statusBadge =
    `<div style="display:inline-block;font-family:${MONO};font-size:13px;` +
    `font-weight:bold;letter-spacing:2px;color:${INK};background-color:${badgeColor};` +
    `border:3px solid ${INK};padding:6px 14px;margin:0 0 20px 0;">${badgeText}</div>`;

  const inner = accepted
    ? statusBadge +
      heading(`Great news, ${requester}! 🎉`) +
      paragraph(
        `<strong style="color:${INK};">${owner}</strong> said <strong style="color:${INK};">yes</strong> to your request to borrow <strong style="color:${INK};">"${title}"</strong>.`,
      ) +
      paragraph(
        `Open your library to sort out the handoff and start reading.`,
      ) +
      ctaRow(pixelButton(params.appUrl, "View your library →"))
    : statusBadge +
      heading(`An update on your request, ${requester}`) +
      paragraph(
        `<strong style="color:${INK};">${owner}</strong> isn't able to lend <strong style="color:${INK};">"${title}"</strong> right now.`,
      ) +
      paragraph(
        `No worries — there are plenty more books to discover on Lendy.`,
      ) +
      ctaRow(pixelButton(params.appUrl, "View your library →"));

  const subject = accepted
    ? `🎉 ${params.ownerUsername} said yes to "${params.bookTitle}"!`
    : `${params.ownerUsername} responded about "${params.bookTitle}"`;

  return { subject, html: layout(inner) };
}

/**
 * Sent to a user when someone uses the "contact" form on their profile.
 * Renders the message in a quoted pixel-card. Always shows a "Reply on Lendy →"
 * CTA; when `fromEmail` is present, also adds a direct mailto: reply button.
 */
export function contactMessageEmail(params: {
  toUsername: string;
  fromName: string;
  fromEmail?: string | null;
  message: string;
  appUrl: string;
}): EmailContent {
  const to = escapeHtml(params.toUsername);
  const from = escapeHtml(params.fromName);
  const messageHtml = escapeHtml(params.message).replace(/\r?\n/g, "<br />");

  const fromLine = params.fromEmail
    ? `<div style="font-family:${MONO};font-size:13px;color:${MUTED};padding-top:4px;">` +
      `${escapeHtml(params.fromEmail)}</div>`
    : "";

  const quote =
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin:4px 0 22px 0;background-color:${CREAM};border:3px solid ${INK};` +
    `border-left:8px solid ${PINK};width:100%;">` +
    `<tr><td style="padding:16px 18px;">` +
    `<div style="font-family:${MONO};font-size:15px;line-height:1.6;color:${INK};white-space:normal;">${messageHtml}</div>` +
    `</td></tr></table>`;

  const replyEmailButton = params.fromEmail
    ? `<div style="padding:10px 0 0 0;">` +
      pixelButton(
        `mailto:${params.fromEmail}`,
        `Email ${params.fromName} ✉`,
        WORDMARK_COLORS[4], // brand blue
      ) +
      `</div>`
    : "";

  const inner =
    heading(`You've got mail, ${to}! ✉️`) +
    paragraph(
      `<strong style="color:${INK};">${from}</strong> sent you a message through your Lendy profile:`,
    ) +
    `<div style="font-family:${MONO};font-size:13px;font-weight:bold;color:${SOFT};">From: ${from}</div>` +
    fromLine +
    quote +
    ctaRow(pixelButton(params.appUrl, "Reply on Lendy →")) +
    replyEmailButton;

  return {
    subject: `✉️ ${params.fromName} sent you a message on Lendy`,
    html: layout(inner),
  };
}
