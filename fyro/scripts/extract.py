import re, glob, json
keys = set()
pat = re.compile(r"""\bt\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")""")
for f in glob.glob('src/**/*.ts*', recursive=True):
    s = open(f, encoding='utf8').read()
    for m in pat.finditer(s):
        keys.add((m.group(1) or m.group(2)).replace("\\'", "'"))
# nav labels / constant strings passed through t(variable)
extra = ['Dashboard','Feedback inbox','Incidents','Emerging radar','Regional briefs','Routing','Stores','AP map','Pipeline layers','Evaluation','Data explorer','Taxonomy','Severity & escalation','Users','Ask Tara','Notifications','Settings','Help','Head Office','Regional Manager','Function Owner','Store Manager','Analyst','How it works','Features','Regions','Pricing','Docs','About','Product','Resources','Company','New','Acknowledged','In progress','Resolved']
keys.update(extra)
json.dump(sorted(keys), open('scripts/keys.json', 'w', encoding='utf8'), ensure_ascii=False, indent=0)
print(len(keys))
