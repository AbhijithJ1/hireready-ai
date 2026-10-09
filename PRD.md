# PRD — AI Interview Prep Coach

## The problem

Every time I have an interview coming up, I spend hours googling questions and trying to structure my answers. The problem is:

- Generic lists don't help because every role is different
- STAR format is hard to write from scratch
- Coaching sessions cost ₹5,000+ and aren't scalable
- Most people just wing it and wonder why they didn't get the job

## What I'm building

A simple tool where you paste the actual job description and get:

1. 12-15 tailored interview questions (behavioral + technical + culture fit)
2. Each with a structured STAR answer you can actually use
3. A mock interview mode where you practice and get scored

## Who it's for

**Primary: Fresh graduates**
- Applying to 20+ companies
- Don't know what questions to expect
- Need structure, not just tips

**Secondary: Switching professionals**
- 3-8 years experience
- Know their work but can't articulate it in interviews
- Need to reframe experience into STAR stories

## User stories

1. As a job seeker, I want to paste a job description so I get questions specific to that role
2. As a fresh grad, I want to see STAR-format answers so I know how to structure mine
3. As a user, I want to practice in mock interview mode so I build confidence
4. As a user, I want to copy answers easily so I can save them for revision

## What I'm NOT building (V1)

- User accounts or login
- History saving (no database)
- Resume parsing
- Voice-based interviews
- Payment or subscription model

These are all good features for V2, but for now the goal is: paste JD → get questions → practice. That's it.

## Success metrics

| Metric | Target | Why |
|--------|--------|-----|
| Time to first value | < 30 seconds | If it takes longer, people leave |
| Answer quality | 80%+ rated useful | Need to measure this with a feedback button |
| Session length | 5-10 minutes | Long enough to be useful, short enough to not bore |
| Return rate | 30%+ within a week | People should come back before their interview |

## How it works (technical)

1. User pastes job description
2. Frontend sends it to our API route
3. API route calls Claude with a structured prompt
4. Response streams back via Server-Sent Events
5. Frontend parses and displays questions with expand/collapse

No database. No auth. Just a clean API call and good prompt engineering.

## What I learned building this

- Streaming responses are way better than waiting for the full response
- Prompt engineering matters more than I expected — small changes in the prompt give very different outputs
- STAR format is hard to generate well without specific examples
- The mock interview mode was harder to build than the question generator

## Next steps (if I had more time)

- Add a feedback button ("was this answer useful?")
- Save history with user accounts
- Voice input for mock interviews
- Support for multiple languages
- Integration with LinkedIn job descriptions
