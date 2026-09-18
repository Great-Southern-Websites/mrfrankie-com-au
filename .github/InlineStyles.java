import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Puts the site's stylesheet inside every generated page, so a visitor's browser can draw
 * the page from the first file it receives instead of waiting for a second one.
 *
 * <p>Run by the deploy workflow after the site is generated and before it is published:
 * {@code java .github/InlineStyles.java target/roq}. Only the published copy changes;
 * {@code public/css/main.css} stays the file to edit. A stylesheet that is large, pulls in
 * other files by a relative address, or cannot safely sit inside a page is left linked.
 * Written by Great Southern Websites; safe to delete along with its step in deploy.yml.
 */
public class InlineStyles {

    /** Past this, repeating the stylesheet in every page costs more than the request it saves. */
    static final int MAX_BYTES = 32 * 1024;

    static final Pattern LINK = Pattern.compile(
            "<link rel=\"stylesheet\" href=\"((?:https?://[^\"/]+)?/(?:[^\"]*/)?css/main\\.css)\"\\s*/?>");
    /** url(...) or @import whose address is relative to the stylesheet, which moves when the CSS does. */
    static final Pattern RELATIVE = Pattern.compile(
            "url\\(\\s*['\"]?(?!data:|https?:|/|#)[^)'\"\\s]|@import");

    public static void main(String[] args) throws IOException {
        Path out = Path.of(args.length > 0 ? args[0] : "target/roq");
        Path css = out.resolve("css/main.css");
        if (!Files.exists(css)) {
            System.out.println("No css/main.css in " + out + ", nothing to inline");
            return;
        }
        String style = Files.readString(css, StandardCharsets.UTF_8);
        String why = style.length() > MAX_BYTES ? "it is larger than " + MAX_BYTES / 1024 + " KB"
                : RELATIVE.matcher(style).find() ? "it loads other files by a relative address"
                : style.toLowerCase().contains("</style") ? "it contains a closing style tag"
                : null;
        if (why != null) {
            System.out.println("The stylesheet stays linked: " + why);
            return;
        }
        String block = "<style>\n" + style.strip() + "\n</style>";
        int pages = 0;
        List<Path> html;
        try (Stream<Path> walk = Files.walk(out)) {
            html = walk.filter(p -> p.getFileName().toString().endsWith(".html")).toList();
        }
        for (Path page : html) {
            String s = Files.readString(page, StandardCharsets.UTF_8);
            Matcher m = LINK.matcher(s);
            if (!m.find()) continue;
            Files.writeString(page, s.substring(0, m.start()) + block + s.substring(m.end()), StandardCharsets.UTF_8);
            pages++;
        }
        System.out.println("Stylesheet put inside " + pages + " of " + html.size() + " pages");
    }
}
