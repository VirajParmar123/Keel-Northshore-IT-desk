# Keel — Northshore IT Help Desk

Keel is the internal IT desk for Northshore, a fictional studio with offices in Brooklyn, Austin, and London. Employees ask an offline bot. The bot answers only from questions and replies that IT has saved. If nothing matches, it refuses to guess and opens a path to a real request.

The rest of the desk is a working queue: priorities, SLAs, assignment, public replies, internal notes, service health, a people directory with asset tags, and a small insights board.

Nothing is sent to an AI service. Demo data lives in the browser.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Desk code: `northshore`

| Person | Role | Use them to |
| --- | --- | --- |
| Maya Chen | Employee | Ask Keel and follow her open VPN request |
| Jordan Hale | IT support | Work the queue, claim HD-10423, write a missed answer |
| Priya Shah | IT manager | Insights, new-hire setup, service updates |

Reset demo data from the account menu if you want the original Saturday snapshot back.

## What the bot will and won't do

- It scores the question against each stored question and its aliases.
- A clear match returns that stored answer and its steps, word for word.
- Two close matches ask which one you meant.
- No match, or a request for a person, does not invent steps. It offers to open a request.
- IT can add, edit, or remove answers. The next question uses the updated library immediately.

```bash
npm test
```

The matcher tests cover VPN, Wi-Fi, printing, MFA, phishing, and the cases where Keel should clarify or stay quiet.

## Notes

The uploaded brief was not on disk in this environment. The desk follows the request that came with it: an offline question-and-answer bot, with the rest of a realistic help desk working around it.
