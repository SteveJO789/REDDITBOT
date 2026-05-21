import { describe, expect, it } from "vitest";
import { mapRedditListingToPosts } from "../server/reddit-api.mjs";

describe("server reddit-api mapper", () => {
  it("maps Reddit Listing JSON into dashboard posts", () => {
    const posts = mapRedditListingToPosts(
      {
        kind: "Listing",
        data: {
          children: [
            {
              kind: "t3",
              data: {
                id: "abc123",
                author: "post_author",
                subreddit: "WFH",
                title: "Is there a better way to set up my desk?",
                selftext: "My neck hurts after working from a laptop.",
                permalink: "/r/WFH/comments/abc123/is_there_a_better_way/",
                created_utc: 1710000000
              }
            }
          ]
        }
      },
      "desk setup"
    );

    expect(posts).toEqual([
      expect.objectContaining({
        id: "abc123",
        author: "post_author",
        subreddit: "WFH",
        title: "Is there a better way to set up my desk?",
        body: "Is there a better way to set up my desk?\n\nMy neck hurts after working from a laptop.",
        matchedKeyword: "desk setup",
        createdAt: "2024-03-09T16:00:00.000Z",
        url: "https://www.reddit.com/r/WFH/comments/abc123/is_there_a_better_way/"
      })
    ]);
  });
});
