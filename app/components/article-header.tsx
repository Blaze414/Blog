import type { BlogPost } from "../content";
import { ShareButton } from "./share-button";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function machineDate(date: string) {
  const [day, month, year] = date.split(" ");
  const monthNumber = months.indexOf(month) + 1;
  return `${year}-${`${monthNumber}`.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function ArticleHeader({ post }: { post: BlogPost }) {
  return (
    <header className="post-header" id="article-start">
      <span className="eyebrow">{post.category}</span>
      <h1 tabIndex={-1}>{post.title}</h1><p>{post.summary}</p>
      <div className="byline"><span>By {post.author}</span><time dateTime={machineDate(post.date)}>{post.date}</time><ShareButton title={post.title} /></div>
    </header>
  );
}
