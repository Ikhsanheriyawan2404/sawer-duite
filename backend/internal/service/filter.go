package service

import (
	"regexp"
	"sort"
	"strings"
)

type FilterResult struct {
	OriginalText string
	CensoredText string
	TTSText      string
}

type FilterService struct {
	badwords []string
	patterns []*regexp.Regexp
}

func NewFilterService() *FilterService {
	words := []string{
		"anjing", "anjrit", "anjeng", "ansat", "anjg", "ajg",
		"bangsat", "bgsd", "bangsatya", "babi", "bepeng", "kunyuk",
		"bajingan", "bjgn", "brengsek", "brgsk",
		"goblok", "goblog", "goblokia", "gobloks", "tolol", "tll", "bego", "goblokers",
		"idiot", "sinting", "gendeng", "bego", "bloon",
		"perek", "lonte", "lont", "perekers", "jablay", "germo", "mucikari",
		"peler", "kontol", "kntl", "titit", "memek", "mmk", "pepek", "puki", "pantat",
		"jembut", "beler", "tetek", "toket", "ngentot", "ngentod", "ngntd", "ewe", "ngewe",
		"itil", "ngocok", "colay", "coli", "crot",
		"pantek", "cukimai", "pukimai", "panteq",
		"jancok", "jancuk", "cok", "cuk", "dancok", "dancuk",
		"asu", "asw", "bajirut", "bazingan",
		"setan", "iblis", "dajjal", "lúcifer", "wedhus", "bejad", "bejat", "turuk",
		"cacat", "autis", "banci", "bencong", "waria", "prabowo", "jokowi", "megawati", "megachan", "gibran", "bahlil", "mandi",

		"ass", "asshole", "assmunch", "assclown", "asswipe",
		"bitch", "bitches", "bitchy", "bullshit", "bastard",
		"cunt", "clit", "cock", "cocksucker", "cum", "cumshot",
		"dick", "dickhead", "dildo",
		"fuck", "fucker", "fucking", "fuckface", "motherfucker", "fag", "faggot",
		"goddamn", "goddammit",
		"hell", "hore", "horebag",
		"jerk", "jerkoff",
		"kike", "muff",
		"nigga", "nigger", "negro",
		"pussy", "piss", "pissed",
		"prick", "queer",
		"shit", "shitty", "shite", "slut", "slutty", "twat",
		"wanker", "whore",
		"twatwaffle",
	}

	sort.Slice(words, func(i, j int) bool {
		return len(words[i]) > len(words[j])
	})

	// Kata-kata yang rawan false positive jika dicari sebagai substring.
	// Gunakan \b (word boundary) khusus untuk kata-kata ini agar tidak kena kata normal.
	// Misal: "asu" agar tidak menyensor "asumsi", "mandi" agar tidak menyensor "mandiri".
	strictWords := map[string]bool{
		"asu": true, "asw": true, "cok": true, "cuk": true, "mandi": true,
		"babi": true, "memek": true, "perek": true, "lont": true, "setan": true,
		"hore": true, "ajg": true, "anjg": true, "tll": true, "bego": true,
		"ewe": true, "ass": true, "hell": true, "jerk": true,
		"jokowi": true, "prabowo": true, "megawati": true, "gibran": true, "bahlil": true,
	}

	patterns := make([]*regexp.Regexp, len(words))
	for i, word := range words {
		isStrict := strictWords[strings.ToLower(word)]
		patterns[i] = buildFilterRegex(word, isStrict)
	}

	return &FilterService{
		badwords: words,
		patterns: patterns,
	}
}

// buildFilterRegex membuat regex yang lebih cerdas untuk menangkap variasi bypass.
func buildFilterRegex(word string, strict bool) *regexp.Regexp {
	// Peta substitusi karakter (leetspeak)
	leets := map[rune]string{
		'a': "[a4@]", 'i': "[i1!]", 'o': "[o0]", 's': "[s5$]",
		'e': "[e3]", 't': "[t7]", 'g': "[g9]", 'b': "[b8]",
	}

	var p strings.Builder
	p.WriteString("(?i)")

	if strict {
		p.WriteString("\\b")
	} else {
		// Greedy: Tangkap kata yang mengandung badword tersebut (misal: "kontolodon" atau "dikontol")
		p.WriteString("\\w*")
	}

	runes := []rune(strings.ToLower(word))
	for i, r := range runes {
		if l, ok := leets[r]; ok {
			p.WriteString(l)
		} else {
			p.WriteString(regexp.QuoteMeta(string(r)))
		}
		// Izinkan karakter berulang (misal: "koooontol")
		p.WriteString("+")
		// Izinkan separator non-alphanumeric antar karakter (misal: "k.o.n.t.o.l")
		if i < len(runes)-1 {
			p.WriteString("[^a-zA-Z0-9]*")
		}
	}

	if strict {
		p.WriteString("\\b")
	} else {
		p.WriteString("\\w*")
	}

	return regexp.MustCompile(p.String())
}

func (s *FilterService) Filter(text string) FilterResult {
	if text == "" {
		return FilterResult{}
	}

	censored := text
	tts := text

	for _, re := range s.patterns {
		if re.MatchString(text) {
			censored = re.ReplaceAllStringFunc(censored, func(match string) string {
				runes := []rune(match)
				if len(runes) == 0 {
					return ""
				}
				firstChar := string(runes[0])
				return firstChar + strings.Repeat("*", len(runes)-1)
			})

			tts = re.ReplaceAllString(tts, "[ups]")
		}
	}

	return FilterResult{
		OriginalText: text,
		CensoredText: censored,
		TTSText:      tts,
	}
}
