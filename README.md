# UnfollowX
Unfollow everyone on X (Formerly Twitter) and or unfollow who doesn't follow you back

## Unfollow Everyone on X


1. Go to `https://twitter.com/YOUR_USER_NAME/following`
2. Open the Developer Console. (<kbd>COMMAND</kbd>+<kbd>ALT</kbd>+<kbd>I</kbd> on Mac)
3. Paste the script into the Developer Console and run it

```js
// Unfollow everyone on X (Formerly Twitter) and or unfollow who doesn't follow you back, by Nicholas Resendez (https://twitter.com/nichxbt)
// https://github.com/nirholas/unfollowx
//
// 1. Go to https://twitter.com/YOUR_USER_NAME/following
// 2. Open the Developer Console. (COMMAND+ALT+I on Mac)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 30 October 2023
(() => {
  const $followButtons = '[data-testid$="-unfollow"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';

  const retry = {
    count: 0,
    limit: 3,
  };

  const scrollToTheBottom = () => window.scrollTo(0, document.body.scrollHeight);
  const retryLimitReached = () => retry.count === retry.limit;
  const addNewRetry = () => retry.count++;

  const sleep = ({ seconds }) =>
    new Promise((proceed) => {
      console.log(`WAITING FOR ${seconds} SECONDS...`);
      setTimeout(proceed, seconds * 1000);
    });

  const unfollowAll = async (followButtons) => {
    console.log(`UNFOLLOWING ${followButtons.length} USERS...`);
    await Promise.all(
      followButtons.map(async (followButton) => {
        followButton && followButton.click();
        await sleep({ seconds: 1 });
        const confirmButton = document.querySelector($confirmButton);
        confirmButton && confirmButton.click();
      })
    );
  };

  const nextBatch = async () => {
    scrollToTheBottom();
    await sleep({ seconds: 1 });

    const followButtons = Array.from(document.querySelectorAll($followButtons));
    const followButtonsWereFound = followButtons.length > 0;

    if (followButtonsWereFound) {
      await unfollowAll(followButtons);
      await sleep({ seconds: 2 });
      return nextBatch();
    } else {
      addNewRetry();
    }

    if (retryLimitReached()) {
      console.log(`NO ACCOUNTS FOUND, SO I THINK WE'RE DONE`);
      console.log(`RELOAD PAGE AND RE-RUN SCRIPT IF ANY WERE MISSED`);
    } else {
      await sleep({ seconds: 2 });
      return nextBatch();
    }
  };

  nextBatch();
})();
```

This script:

- Is completely free.
- Doesn't try and get you to sign in or take your personal data.
- Automates your web browser to make it click unfollow buttons, scroll down to reveal more, then do it again.
- No tricks, all of the code is here so you can see exactly what it does.
