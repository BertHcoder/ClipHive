/**
 * Shared constants and utilities for ClipHive.
 */

const DEFAULT_MAX_CLIPS = 100;
const SYNC_CHUNK_SIZE = 6000; // bytes per chunk (under 8,192 sync limit)
const POLL_INTERVAL = 1500; // ms

// Sensitive content detection patterns
const SENSITIVE_PATTERNS = [
  /gh[pousr]_[A-Za-z0-9_]{36,}/,                    // GitHub PATs
  /github_pat_[A-Za-z0-9_]{22,}/,                    // GitHub fine-grained PATs
  /glpat-[A-Za-z0-9\-_]{20,}/,                       // GitLab PATs
  /AKIA[0-9A-Z]{16}/,                                // AWS access key IDs
  /npm_[A-Za-z0-9]{36,}/,                            // npm tokens
  /xox[bposatr]-[A-Za-z0-9\-]{10,}/,                 // Slack tokens
  /sk_(?:live|test)_[A-Za-z0-9]{20,}/,               // Stripe secret keys
  /pk_(?:live|test)_[A-Za-z0-9]{20,}/,               // Stripe publishable keys
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWTs
  /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/,             // SSH/PEM keys
  /(?:api[_-]?key|api[_-]?secret|access[_-]?token|secret[_-]?key|private[_-]?key|auth[_-]?token)\s*[:=]\s*\S{10,}/i,
  /Bearer\s+[A-Za-z0-9\-._~+\/]{20,}=*/i,           // Bearer tokens
  /(?:password|pwd)\s*=\s*[^\s;]{8,}/i,              // Connection string passwords
];

/**
 * Check if text matches sensitive content patterns.
 * @param {string} text - The text to check
 * @returns {boolean} True if text matches a sensitive pattern
 */
function isSensitive(text) {
  return SENSITIVE_PATTERNS.some((p) => p.test(text));
}
