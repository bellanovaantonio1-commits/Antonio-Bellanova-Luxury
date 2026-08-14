import type { PaymentDisplayId } from "../../lib/paymentDisplay.ts";

interface PaymentMethodIconProps {
  id: PaymentDisplayId;
  className?: string;
}

const iconClass = "block h-full w-full max-h-5 object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-300";

export default function PaymentMethodIcon({ id, className = "h-5 w-12" }: PaymentMethodIconProps) {
  const wrap = `${className} flex items-center justify-center shrink-0`;

  switch (id) {
    case "stripe":
      return (
        <span className={wrap}>
          <svg viewBox="0 0 48 32" className={iconClass} aria-hidden>
            <rect width="48" height="32" rx="3" fill="#635BFF" />
            <path
              fill="#fff"
              d="M41.2 17.1c0-2.9-1.4-4.3-3.8-4.3-2.3 0-3.8 1.1-3.8 3.8 0 2.5 2.1 3.2 3.9 4 2.4.8 3.2 1.3 3.2 2.6 0 1.5-1.3 2.4-3.5 2.4-2.3 0-3.5-1-3.7-2.9h-3.6c.2 4.8 3.7 7.4 11 7.4 6.7 0 11-2.8 11-7.6 0-3.2-1.6-5.1-6.2-6.2l-2.5-.6c-1.9-.5-2.7-.9-2.7-1.9 0-1.1 1-1.8 2.5-1.8 1.6 0 2.5.7 2.6 2.2h3.6zM22.1 11.5h7l-.5 3.8h-.1c-1.1-2.7-3-4.1-5.9-4.1-4.5 0-7.5 4-7.5 10.1 0 5.7 2.8 9.2 7.1 9.2 2.7 0 4.8-1.3 6-4h.1l-.5 3.6h6.9V11.5h-6.9zM8.4 11.5H2.5v18.1h7V11.5z"
            />
          </svg>
        </span>
      );

    case "visa":
      return (
        <span className={wrap}>
          <svg viewBox="0 0 48 32" className={iconClass} aria-hidden>
            <rect width="48" height="32" rx="3" fill="#1A1F71" />
            <path
              fill="#F7B600"
              d="M19.5 20.5 21.8 11.5h3.5l-2.3 9h-3.5zm9.8-8.8c-.7-.3-1.8-.6-3.2-.6-3.5 0-6 1.8-6 4.4 0 1.9 1.7 3 3 3.6 1.3.6 1.8 1 1.8 1.5 0 .8-1.1 1.2-2.1 1.2-1.4 0-2.2-.2-3.4-.7l-.5-.2-.5 3.1c.9.4 2.5.7 4.2.7 3.8 0 6.2-1.9 6.3-4.8.1-1.6-.9-2.8-2.9-3.8-1.2-.6-2-1-2-1.6 0-.5.6-1.1 1.9-1.1 1.1 0 1.9.2 2.5.5l.3.1.6-2.8zm8.2-.2h-2.7c-.8 0-1.5.2-1.8 1l-5.2 9h3.7l.7-2h4.5l.4 2h3.3l-2.9-10zm-4.1 6.5 1.9-5.2.4 5.2h-2.3zM14.2 11.5l-3.4 9h-3.7l3.4-9h3.7z"
            />
            <path fill="#fff" d="M10.5 11.5 7.8 18.8 7.4 16.8c-.6-2.2-2.5-4-4.7-4.9l3.2 8.6H0L5.6 11.5h4.6z" />
          </svg>
        </span>
      );

    case "mastercard":
      return (
        <span className={wrap}>
          <svg viewBox="0 0 48 32" className={iconClass} aria-hidden>
            <rect width="48" height="32" rx="3" fill="#141414" />
            <circle cx="19" cy="16" r="9" fill="#EB001B" />
            <circle cx="29" cy="16" r="9" fill="#F79E1B" />
            <path
              fill="#FF5F00"
              d="M24 9.2a9 9 0 0 0-3.4 7.8 9 9 0 0 0 3.4 7.8 9 9 0 0 0 3.4-7.8 9 9 0 0 0-3.4-7.8z"
            />
          </svg>
        </span>
      );

    case "amex":
      return (
        <span className={wrap}>
          <svg viewBox="0 0 48 32" className={iconClass} aria-hidden>
            <rect width="48" height="32" rx="3" fill="#006FCF" />
            <path
              fill="#fff"
              d="M6.5 11.5h3.2l.8 2 .8-2h3.2v9h-2.3v-5.2l-1.1 2.7h-1.4l-1.1-2.7V20.5H6.5v-9zm10.2 0h5.6c1.8 0 3.1 1.2 3.1 3 0 1.2-.6 2.1-1.6 2.5l2 3.5h-2.6l-1.7-3h-1.4v3h-2.4v-9zm2.4 1.8v1.8h2.8c.6 0 1-.3 1-.9s-.4-.9-1-.9h-2.8zm8.1-1.8h2.4l3.2 5.2V11.5h2.4v9h-2.4l-3.2-5.2v5.2h-2.4v-9zm10.8 0h7.5v1.8h-5.1v1.5h4.6v1.8h-4.6v1.1h5.2v1.8h-7.6v-9z"
            />
          </svg>
        </span>
      );

    case "apple_pay":
      return (
        <span className={wrap}>
          <svg viewBox="0 0 48 32" className={iconClass} aria-hidden>
            <rect width="48" height="32" rx="3" fill="#000" />
            <path
              fill="#fff"
              d="M13.2 10.1c-.6.7-1.5 1.2-2.4 1.1-.1-1 .4-2.1.9-2.8.6-.7 1.5-1.2 2.4-1.3.1 1-.3 2-.8 2.8zm.8 1.3c-1.3-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.4 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 1.9 2.5 1.9 1 0 1.4-.6 2.6-.6 1.2 0 1.5.6 2.6.6 1.1 0 1.9-.9 2.6-1.9.4-.6.6-1 1-1.6-2.1-.9-2.2-4.2-.1-5.4-.9-.6-2.1-1-2.9-1z"
            />
            <text x="21" y="20.5" fill="#fff" fontFamily="system-ui, -apple-system, sans-serif" fontSize="9.5" fontWeight="500">
              Pay
            </text>
          </svg>
        </span>
      );

    case "google_pay":
      return (
        <span className={wrap}>
          <svg viewBox="0 0 48 32" className={iconClass} aria-hidden>
            <rect width="48" height="32" rx="3" fill="#fff" />
            <path fill="#EA4335" d="M18.5 16c0-1.3.4-2.5 1.1-3.5l-2.8-2.2C15.7 12.1 14.8 14 14.8 16s.9 3.9 2 5.7l2.8-2.2c-.7-1-1.1-2.2-1.1-3.5z" />
            <path fill="#FBBC04" d="M22.8 19.3c-1.2 0-2.3-.4-3.1-1.1l-2.8 2.2c1.4 1.2 3.2 1.9 5.2 1.9 2.9 0 5.4-1.1 7.2-3.1l-2.8-2.2c-.9.8-2.1 1.3-3.5 1.3z" />
            <path fill="#34A853" d="M14.8 16c0-.7.1-1.4.3-2.1l-2.8-2.2c-.9 1.7-1.4 3.6-1.4 5.6 0 2 .5 3.9 1.4 5.6l2.8-2.2c-.2-.7-.3-1.4-.3-2.1z" />
            <path fill="#4285F4" d="M22.8 12.7c1.6 0 3 .6 4.1 1.5l2.8-2.8C26.9 9.8 25 9 22.8 9c-2.5 0-4.6 1.1-6 2.9l2.8 2.2c.8-1.2 2-2 3.2-2.4z" />
            <text x="27" y="20.5" fill="#3C4043" fontFamily="system-ui, sans-serif" fontSize="9.5" fontWeight="500">
              Pay
            </text>
          </svg>
        </span>
      );

    case "paypal":
      return (
        <span className={wrap}>
          <svg viewBox="0 0 48 32" className={iconClass} aria-hidden>
            <rect width="48" height="32" rx="3" fill="#fff" />
            <path
              fill="#003087"
              d="M16.8 10.5h-5.8c-.4 0-.7.3-.8.7L8.8 24c0 .3.2.5.4.5h2.7c.4 0 .7-.3.8-.7l.6-3.8c.1-.4.4-.7.8-.7h1.8c3.7 0 5.8-1.8 6.3-5.4.3-1.6 0-2.8-.6-3.6-.6-.9-1.7-1.3-3.2-1.3z"
            />
            <path
              fill="#009CDE"
              d="M27.2 10.5h-5.8c-.4 0-.7.3-.8.7l-1.7 11.1c0 .3.2.5.4.5h2.7c.4 0 .7-.3.8-.7l.6-3.8c.1-.4.4-.7.8-.7h1.8c3.7 0 5.8-1.8 6.3-5.4.2-1.2-.4-2.6-3.1-2.6z"
            />
            <path
              fill="#012169"
              d="M18.8 10.5h5.4c1.5 0 2.5.5 3.1 1.4.4.6.5 1.4.3 2.3-.6 3.6-2.8 5.3-6.3 5.3h-1.8c-.4 0-.7.3-.8.7l-.6 3.8c0 .3-.4.5-.8.5h-2.7c-.2 0-.4-.2-.4-.5l1.6-10.8c.1-.4.4-.7.8-.7z"
            />
          </svg>
        </span>
      );

    case "bank_transfer":
      return (
        <span className={wrap}>
          <svg viewBox="0 0 48 32" className={iconClass} aria-hidden fill="none">
            <rect width="48" height="32" rx="3" fill="#0a0a0a" stroke="#c5a059" strokeWidth="0.75" />
            <path
              stroke="#c5a059"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M24 8 34 14H14L24 8zm-7 6v8m4-8v8m6-8v8m4-8v8M12 24h24"
            />
            <path stroke="#c5a059" strokeWidth="1.1" d="M10 24h28" />
          </svg>
        </span>
      );

    default:
      return null;
  }
}
