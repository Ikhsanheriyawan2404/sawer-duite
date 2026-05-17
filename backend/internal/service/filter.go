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
		"setan", "iblis", "dajjal", "lúcifer", "wedhus", "bejad", "bejat",
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

	patterns := make([]*regexp.Regexp, len(words))
	for i, word := range words {
		patterns[i] = regexp.MustCompile("(?i)\\b" + regexp.QuoteMeta(word) + "\\b")
	}

	return &FilterService{
		badwords: words,
		patterns: patterns,
	}
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
