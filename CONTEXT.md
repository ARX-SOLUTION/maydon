# Domain Glossary

- **Booking**: A request by a user to reserve a time slot. Can be in `pending`, `confirmed`, `rejected`, or `cancelled` statuses.
- **Cancellation (Bekor qilish/No-show)**: When an already `confirmed` booking is revoked by an admin (e.g. because the user did not show up). The booking remains in the database with status `cancelled` for historical and penalty (blacklisting) tracking.
- **Rejection (Rad etish)**: When a `pending` booking request is denied by an admin before it was ever confirmed. Status becomes `rejected`.
