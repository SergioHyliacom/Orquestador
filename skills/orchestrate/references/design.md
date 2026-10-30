# Design: write, review and discard stories

Load the `stories` skill to write or change a story. **The designer never handles git: their session does,** and tells them what happened in plain words, never in git terms.

## Write the story

Design writes every story with a screen. A story with no screen (a rule on the data, a periodic task, an importer) can be written by the developer who understands it; the steps are the same, skipping 1 to 3.

Design starts from Figma, the only home of the design: a story links its frames and never copies them.

1. **Read the design.** Your human names the Figma file or page. Read it with the Figma connector and propose the list of stories: one per capability a person notices, not one per screen (`stories` skill, "From a Figma design"). The states Figma draws become criteria; name the ones it lacks, so design draws them.
2. **Mobbin, as a reference.** For each proposed story, look at how other apps solve the same flow, to find missing states and unhappy paths. What design adopts is drawn in Figma first. Save the references your human keeps in a Mobbin collection named after the story, never in the repository.
3. **Your human confirms the list:** which stories, how they split, and the activity of each.
4. **Create the Jira card** in Design, with your human's ok on its text: the title, the story sentence ("Como <persona>, quiero…, para…") and the Figma link. Never the criteria. Its key is the story's ID.
5. **Write the story** with your human: the rules, the states of each screen as criteria, the Figma frames in `screens`. Leave `sides` and `operations` empty: the kickoff fills them.
6. Run `node <scripts>/stories.mjs --ready <ID>` until it is ready.
7. **Hand it over.** Create `design/<ID>` from the integration branch on the remote, commit the story, push, and open a pull request to the integration branch, with another person of design as reviewer (else the developer who will do its kickoff: the card's Frontend person when it has a screen, its Backend person when it has none). Add to the card the link to the story file. Ask your human whether to merge it now or wait for the review: the author may merge a `design/<ID>` alone, because the kickoff reads the story again before anything is built. Merge it through the API with the build green (`references/git.md`). When it merges, the story is the developers'.

If the story's title or sentence changes later, update the card too, with your human's ok. Nothing else of the story goes to Jira.

**A story the kickoff returned** comes back to Design with its **Open questions**, one line per criterion. Answer them with your human by changing the story and emptying **Open questions**, in a new `design/<ID>` pull request. When it merges, the card goes back to Contract.

## Visual review

Only stories with a criterion `[unverified]` come here. Your human compares the screenshots on the card, and the running app when needed, with the design, and answers: approved, or what to change. Bring `story/<ID>` up to date (`git fetch`, `git switch story/<ID>`, `git pull`), write the verdict, commit and push. If the push is rejected, pull and push again. A conflict only happens when a developer edited the same criterion at the same moment: stop, and ask the integrating developer in a card comment.

- **Approved:** the `[unverified]` criteria become `[manual YYYY-MM-DD, <designer>]`. The pipeline gives the card back to the integrating side.
- **Adjustments:** change the criteria of this same story, never a new story, and set each changed criterion back to `[unbuilt]`. The card returns to Integration. Tell the developers on the card which criteria changed, and whose they are: what the API decides (data, order, a rule, an error message, a limit) is backend's; what the screen shows is frontend's.

## Discard a story

Discarding is a product call: your human decides it.

1. Create `design/<ID>` from the integration branch on the remote. Set `discarded: true` and add the **Discard reason** section (`stories` skill, "Discarding"). Open the pull request; like any `design/<ID>`, another person approves it or its author merges it alone. When it merges, the pipeline moves the card to Discarded from whatever stage it was in.
2. Once it is merged, delete `story/<ID>` if it exists, with your human's ok (`git push origin --delete story/<ID>`). Never merge it: it holds unfinished work.

A story that was already done keeps its code and its tests on the integration branch. Removing them is a task for the developers (`references/outside-stories.md`).
