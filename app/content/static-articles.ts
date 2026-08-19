import type { BlogPost } from "./types";
import { documentAssets, placeDocument } from "./document-assets";
import { mediaAssets, placeMedia } from "./media-assets";
import { localPreviewArticles } from "./local-preview-articles";

export const staticArticles = [
  ...localPreviewArticles,
  {
    id: "tokyo-skytree-and-shibuya",
    slug: "tokyo-skytree-and-shibuya",
    featuredRank: 1,
    category: "Travel",
    title: "Tokyo Skytree and Shibuya: a day above the city lights",
    summary: "From long queues and a sky-high awkward photo to burgers, neon and Hachikō—a day in Tokyo made memorable by all its imperfect moments.",
    date: "21 July 2026",
    author: "Al Zadid Yusuf",
    tags: ["Tokyo", "Japan travel", "Tokyo Skytree", "Shibuya", "Travel stories"],
    accent: "navy",
    art: "city",
    artLabel: "TOKYO\nABOVE",
    heroImage: placeMedia(mediaAssets.skytreeView, -1),
    sections: [
      {
        id: "finding-the-way-up",
        title: "Finding the way up",
        paragraphs: [
          "On the morning of May 17, my brother-in-law and I travelled from Umejima Station to Tokyo Skytree Station, changing trains at Kita-senju along the way. We left at around 11:00 a.m., avoiding the morning rush hour and enjoying a smooth, comfortable journey.",
          "Things became less straightforward after we arrived. We somehow walked in circles while trying to find the entrance and ticket counter. Because we had not booked in advance, a massive queue was waiting for us. While searching, we came across a Taiwanese festival outside the tower—an unexpected burst of colour and energy that made the wait more interesting.",
          "After buying our tickets, we found another queue near the entrance. Altogether, we waited for around an hour and a half and finally entered Tokyo Skytree at approximately 3:30 p.m.",
        ],
        images: [
          placeMedia(mediaAssets.taiwaneseFestival, 1),
          placeMedia(mediaAssets.skytreeEntrance, 2),
        ],
      },
      {
        id: "tokyo-from-above",
        title: "Tokyo from above",
        paragraphs: [
          "Our journey upwards began in an autumn-themed elevator decorated with beautiful seasonal motifs. The interior was impressive, and the lift travelled towards Floor 350 at around 36 kilometres per hour.",
          "When the doors opened, the panoramic view stopped us in our tracks. Tokyo seemed to stretch endlessly in every direction, with Tokyo Tower visible in the distance. Enjoying it also meant carefully navigating crowds of visitors, each searching for the perfect position for a photograph.",
          "We then continued to Floor 445 and entered the Tembo Galleria. Its gently sloping, glass-walled skywalk circles upwards towards Floor 450. At Sorakara Point, the tower’s highest accessible point, the enormous city below felt almost impossible to comprehend. Despite the crowds, I managed to take plenty of photographs while everyone around me tried to capture the same extraordinary scale.",
        ],
      },
      {
        id: "the-imperfect-photo",
        title: "The imperfect photo",
        paragraphs: [
          "On Floor 450, I tried the Floating Photo service, which creates the illusion that you are suspended above the Tokyo skyline. I have never felt completely comfortable being photographed—especially when I have to pose—so I became awkward and produced a rather embarrassing result.",
          "Still, it was a once-in-a-lifetime opportunity, and I am glad I did it. Looking back, the awkward pose makes the image more personal. It records not only where I was, but exactly how I felt in that moment.",
        ],
        quote: "Sometimes the imperfect moments become the best memories because they capture how you genuinely felt at the time.",
      },
      {
        id: "back-on-the-ground",
        title: "Back on the ground",
        paragraphs: [
          "Once we had finished exploring, we descended in two stages: from Floor 445 to Floor 350, then from Floor 350 to Floor 5. Throughout the visit, my brother-in-law served as my personal translator because he is fluent in Japanese. I attempted to survive with my extremely limited ‘yes, no and very good’ level of Japanese. I probably embarrassed myself a few times, but that was part of the fun.",
          "From Floor 5, we took the escalators down to Level 2 and stepped outside through the terrace exit near Tokyo Solamachi’s West Yard. After so much time enclosed by lifts, glass and crowds, the open view across the railway tracks and surrounding towers felt like a welcome change of scale.",
        ],
        images: [placeMedia(mediaAssets.levelTwoTerrace, 1)],
      },
      {
        id: "lunch-and-a-conversation",
        title: "Lunch and the conversation I nearly had",
        paragraphs: [
          "After leaving the tower, we had a late lunch at Kua’Aina Hawaiian Burger & Café. The burgers were genuinely delicious and exactly what we needed after spending so much time waiting, walking and navigating through crowds.",
          "One of the waiters mentioned that she had studied English in Brisbane as part of the mall’s efforts to become more welcoming to international visitors. Since I live in Melbourne, it was amusing and unexpectedly comforting to hear Australia mentioned while visiting Japan.",
          "Unfortunately, despite being handed the perfect conversation starter, I was far too shy to say much—particularly because the waiter was a woman. My brother-in-law eventually stepped in and started the conversation on my behalf, clearly enjoying the opportunity to expose my complete lack of social confidence.",
          "Afterwards, he jokingly asked, “So, did you manage to give her your phone number for future purposes?”",
          "My immediate inner monologue was something along the lines of: *I could barely maintain a normal conversation, and this man expected me to exchange phone numbers? Yes, this is exactly why I am going to remain single.*",
          "Nothing came from the interaction, of course, but it was still a funny and memorable moment. Hearing a reference to Australia in a foreign country felt strangely familiar—even if the encounter also served as another reminder that my social skills still needed considerably more development.",
        ],
      },
      {
        id: "shibuya-after-dark",
        title: "Shibuya after dark",
        paragraphs: [
          "After lunch, we travelled to Shibuya. Darkness had already fallen, which made it the perfect time to experience the bright screens, neon signs and restless nighttime energy of the famous crossing.",
          "We watched crowds move in every direction beneath the enormous illuminated screens. Seeing Shibuya Crossing in person felt completely different from seeing it in films and photographs. The movement, light and surrounding buildings formed the image of modern Tokyo I had always imagined.",
          "We also visited the statue of Hachikō, the loyal Akita remembered for waiting at Shibuya Station for his owner every day, even for years after his owner had died. Too many visitors were waiting for their turn, so I could not take a photo beside the statue. They did, however, make a generous cameo in mine—the closest available compromise. Seeing that symbol of loyalty in person was still meaningful enough.",
        ],
        images: [
          placeMedia(mediaAssets.shibuyaNight, 0),
          placeMedia(mediaAssets.hachikoCameo, 2),
        ],
      },
      {
        id: "stories-worth-remembering",
        title: "Stories worth remembering",
        paragraphs: [
          "After taking in the neon cityscape, we finally headed home. It had been a long day of queues, crowds, breathtaking views, cultural surprises and a few awkward but funny moments.",
          "Despite the waiting, confusion and my embarrassing attempt at the Floating Photo, Tokyo Skytree and Shibuya became one of the most memorable experiences of my trip to Japan. The day reminded me that travel is not only about seeing famous places. It is also about unexpected conversations, small embarrassments and imperfect moments that turn into stories worth telling.",
        ],
        documents: [placeDocument(documentAssets.tokyoDayTimeline, 1)],
      },
    ],
    related: ["notes-from-the-doghouse", "why-snoopy-still-feels-like-home", "a-short-history-of-the-doghouse"],
  },
  {
    id: "why-snoopy-still-feels-like-home",
    slug: "why-snoopy-still-feels-like-home",
    featuredRank: 2,
    category: "Culture",
    title: "Why Snoopy still feels like home",
    summary: "Across generations, a quiet beagle has become shorthand for comfort, optimism and knowing when to take life a little less seriously.",
    date: "18 July 2026",
    author: "The Snoopy HQ team",
    tags: ["Snoopy", "Peanuts", "Nostalgia", "Everyday comfort"],
    accent: "sky",
    art: "house",
    kicker: "A character, a feeling and a remarkably enduring point of view.",
    sections: [
      { id: "more-than-nostalgia", title: "More than nostalgia", paragraphs: ["It is easy to explain Snoopy’s appeal as nostalgia. He appears on childhood lunchboxes, well-read paperbacks and gifts kept long after their wrapping has gone. But nostalgia only explains why people remember him. It does not explain why new readers keep finding him.", "The deeper answer is emotional clarity. Snoopy can be theatrical, stubborn and gloriously self-assured, yet his world remains grounded in friendship and small daily rituals. He makes room for imagination without pretending that ordinary life disappears."], quote: "The best-loved characters do not tell us who to be. They give us more ways to recognise ourselves." },
      { id: "small-worlds", title: "The power of small worlds", paragraphs: ["Peanuts rarely needs a grand setting. A doghouse becomes an airfield, a typewriter desk and a place to watch the day pass. A neighbourhood path can hold an entire philosophy. The scale is part of the magic: meaningful things happen close to home.", "That intimacy translates naturally into objects people live with. A mug, notebook or soft toy is not trying to recreate a spectacle. It is a small reminder of a familiar outlook." ] },
      { id: "room-to-breathe", title: "A little room to breathe", paragraphs: ["Snoopy’s greatest gift may be permission. Permission to daydream, to start again, to enjoy the snack, to dance without an audience and to treat rest as part of a full life.", "That message feels especially current. The world asks for constant attention; Snoopy remains devoted to the nap, the supper dish and the next good idea. Home is not only a place in his stories. It is a pace." ] },
    ], related: ["the-art-of-a-thoughtful-gift", "collecting-peanuts-with-care", "notes-from-the-doghouse"]
  },
  {
    id: "the-art-of-a-thoughtful-gift",
    slug: "the-art-of-a-thoughtful-gift",
    featuredRank: 3,
    category: "Gift guides",
    title: "The art of a thoughtful Peanuts gift",
    summary: "A useful way to choose a present that feels personal—without turning the search into a full-time investigation.",
    date: "11 July 2026",
    author: "Mara Bell",
    tags: ["Gift guides", "Peanuts gifts", "Thoughtful gifting"],
    accent: "coral",
    art: "gift",
    kicker: "Start with the person, then let the character do the talking.",
    sections: [
      { id: "begin-with-ritual", title: "Begin with a ritual", paragraphs: ["The easiest gifts to love are often the easiest to use. Think about the recipient’s ordinary rituals: the first coffee, the commute notebook, the Sunday puzzle or the blanket always pulled from the sofa.", "A character-led gift works best when it joins something the person already enjoys. That is what moves it from charming object to familiar favourite." ] },
      { id: "choose-character", title: "Choose the right character energy", paragraphs: ["Snoopy suits the dreamer, the wit and anyone whose best ideas arrive horizontally. Woodstock brings bright, loyal momentum. Charlie Brown belongs with the quietly persistent. Lucy is for the friend whose advice arrives before you ask.", "You do not need a perfect personality match. One recognisable trait is enough to make the choice feel considered."], quote: "A thoughtful gift says: I noticed the small things that make your days yours." },
      { id: "make-arrival-part", title: "Make the arrival part of the gift", paragraphs: ["Double-check the address, add a simple note when the option is available and leave enough time for the parcel to arrive without suspense becoming stress.", "The final detail is restraint. One well-chosen item usually says more than a box filled for the sake of filling it." ] },
    ], related: ["why-snoopy-still-feels-like-home", "five-gifts-for-quiet-weekends", "collecting-peanuts-with-care"]
  },
  {
    id: "collecting-peanuts-with-care",
    slug: "collecting-peanuts-with-care",
    category: "Collecting",
    title: "Collecting Peanuts with care, not clutter",
    summary: "A calmer approach to building a collection around meaning, display and the pieces you genuinely enjoy living with.",
    date: "3 July 2026",
    author: "Jun Park",
    tags: ["Collecting", "Peanuts", "Display ideas", "Mindful collecting"],
    accent: "teal",
    art: "shelf",
    kicker: "A collection should make a room feel more like yours, not less usable.",
    sections: [
      { id: "find-thread", title: "Find the thread", paragraphs: ["Strong collections tend to have an idea running through them. It might be a single character, a decade, a colour palette, ceramics, books or objects tied to particular memories.", "A clear thread makes decisions easier. It gives you a reason to admire something without needing to own it." ] },
      { id: "display-breathe", title: "Let the display breathe", paragraphs: ["Objects become easier to appreciate when they have space around them. Rotate pieces rather than keeping everything out at once, and use height, negative space and a limited colour story to create rhythm.", "The pieces in storage are not failing. Rotation protects them from dust and sunlight while making each return to the shelf feel fresh."], quote: "Curation is not about having less enthusiasm. It is about giving that enthusiasm a shape." },
      { id: "record-stories", title: "Keep the stories with the objects", paragraphs: ["A simple note about where a piece came from, who gave it to you or why it mattered can become as valuable as the object itself.", "Collections live across time. Good records help future-you remember the meaning that was obvious on the day you brought something home." ] },
    ], related: ["why-snoopy-still-feels-like-home", "notes-from-the-doghouse", "the-art-of-a-thoughtful-gift"]
  },
  {
    id: "notes-from-the-doghouse",
    slug: "notes-from-the-doghouse",
    category: "Studio notes",
    title: "Notes from the doghouse: designing for quiet delight",
    summary: "What Peanuts teaches us about restraint, visual rhythm and leaving enough space for a small idea to land.",
    date: "24 June 2026",
    author: "Snoopy HQ Studio",
    tags: ["Editorial design", "Snoopy HQ", "Studio notes", "Design principles"],
    accent: "navy",
    art: "type",
    kicker: "Warmth works best when it has room around it.",
    sections: [
      { id: "clarity-first", title: "Clarity comes first", paragraphs: ["The most memorable Peanuts moments are rarely the busiest. A line, a pause and one precise expression can carry the scene. That economy is a useful design principle beyond the comic strip.", "When everything asks for attention, nothing feels important. Clear hierarchy lets one idea lead while supporting details do their work quietly." ] },
      { id: "character-dose", title: "Character in small doses", paragraphs: ["Playfulness does not require decoration on every surface. A warm accent, an unexpected caption or a tiny moment of motion can create more personality than a page full of competing references.", "Restraint also keeps the experience welcoming for people who came with a task rather than a desire to browse."], quote: "Delight is not an extra layer. It is clarity with a human pulse." },
      { id: "make-useful-beautiful", title: "Make the useful beautiful", paragraphs: ["Good editorial design respects reading. Comfortable line lengths, predictable navigation and generous spacing are not neutral decisions; they communicate care.", "The aim is a page that feels composed without making the reader work to understand the composition." ] },
    ], related: ["why-snoopy-still-feels-like-home", "collecting-peanuts-with-care", "five-gifts-for-quiet-weekends"]
  },
  {
    id: "five-gifts-for-quiet-weekends",
    slug: "five-gifts-for-quiet-weekends",
    category: "Gift guides",
    title: "Five gifts for very quiet weekends",
    summary: "Books, blankets and small comforts for people who understand that sometimes the best plan is no plan at all.",
    date: "15 June 2026",
    author: "Ella Hart",
    tags: ["Gift guides", "Quiet weekends", "Comfort", "Peanuts gifts"],
    accent: "sky",
    art: "weekend",
    kicker: "A field guide to staying in, slowing down and doing it properly.",
    sections: [
      { id: "comfort-first", title: "Comfort before novelty", paragraphs: ["Weekend gifts should lower the temperature of the room. Soft texture, a useful shape and an invitation to slow down will outlast a complicated novelty.", "Look for things that ask very little of their owner: a generous mug, a blanket with real weight or a book that rewards opening at random." ] },
      { id: "build-small-scene", title: "Build a small scene", paragraphs: ["One object can suggest an entire afternoon. Pair a notebook with a favourite pen, a mug with tea, or a puzzle with the promise that nobody needs to finish it in one sitting.", "The scene matters more than the size of the gift. It lets the recipient picture where the item belongs."], quote: "The finest weekend luxury is having nowhere else to be." },
      { id: "leave-space", title: "Leave space in the gesture", paragraphs: ["Avoid turning rest into another project. A quiet gift should not arrive with a checklist or an expectation to report back.", "Wrap it simply, write a short note and let the weekend take it from there." ] },
    ], related: ["the-art-of-a-thoughtful-gift", "why-snoopy-still-feels-like-home", "notes-from-the-doghouse"]
  },
  {
    id: "a-short-history-of-the-doghouse",
    slug: "a-short-history-of-the-doghouse",
    category: "Culture",
    title: "A short history of the world’s most imaginative doghouse",
    summary: "How one small red roof became an office, an aeroplane, an observatory and a symbol of creative freedom.",
    date: "2 June 2026",
    author: "The Snoopy HQ team",
    tags: ["Snoopy", "Peanuts history", "Doghouse", "Imagination"],
    accent: "coral",
    art: "house",
    kicker: "Four walls in theory; an entire universe in practice.",
    sections: [
      { id: "ordinary-object", title: "An ordinary object", paragraphs: ["The doghouse begins as a familiar suburban object, easy to understand at a glance. That familiarity makes everything Snoopy imagines on top of it feel even larger.", "It anchors fantasy in the everyday. The roof never needs to transform for the reader to see what Snoopy sees." ] },
      { id: "stage-for-self", title: "A stage for the self", paragraphs: ["On the doghouse, Snoopy can become a novelist, pilot, scout or philosopher. Each role is complete while it lasts, and each one begins with the confidence to imagine it.", "The structure is both private retreat and public stage—a place to be alone without being cut off from the neighbourhood."], quote: "Imagination does not always need more space. Sometimes it needs a familiar place to begin." },
      { id: "design-icon", title: "From prop to design icon", paragraphs: ["The simple roofline, bold colour and instantly readable silhouette make the doghouse unusually adaptable. It can be reduced to a few shapes and still hold its meaning.", "That is the mark of a durable visual idea: simple enough to remember, generous enough to contain many stories." ] },
    ], related: ["why-snoopy-still-feels-like-home", "notes-from-the-doghouse", "collecting-peanuts-with-care"]
  },
] satisfies readonly BlogPost[];
