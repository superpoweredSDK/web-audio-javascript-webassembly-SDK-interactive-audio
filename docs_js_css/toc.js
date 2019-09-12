class TOC {
    static initialize(e) {
        TOC.sections = [];
        TOC.lastLi = null;
        TOC.lastTop = 0;
        let list = document.createElement('ul');
        list.id = 'toc';

        let h2h3 = document.querySelectorAll('H2,H3'), inChapter = 0, chapter = 0;
        for (let section of h2h3) {
            let li = document.createElement('li');
            let a = document.createElement('a');
            let span = document.createElement('span');
            let id;

            if (section.tagName == 'H2') {
                chapter++;
                li.className = 'chapter';
                id = 'chapter' + chapter;
                span.innerText = chapter + '.';
                inChapter = 1;
            } else {
                id = 'section_' + chapter + '_' + inChapter;
                span.innerText = chapter + '.' + inChapter;
                inChapter++;
            }

            a.appendChild(span);
            a.appendChild(document.createTextNode(section.innerText));

            a.href= '#' + id;
            section.innerText = span.innerText + ' ' + section.innerText;
            section.id = id;
            li.id = 'li_' + id;

            li.appendChild(a);
            list.appendChild(li);
            TOC.sections.push(section);
        }

        let a = document.createElement('a');
        a.innerText = 'Table of Contents';
        a.href = '#top';

        let button = document.createElement('p');
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z"/><path fill="none" d="M0 0h24v24H0V0z"/></svg>';
        button.addEventListener('click', function(e) {
            document.body.classList.toggle('tocClosed');
        });
        let div = document.createElement('div');
        div.appendChild(button);
        div.appendChild(a);
        div.appendChild(list.cloneNode(true));
        let aside = document.createElement('aside');
        aside.appendChild(div);
        document.body.insertBefore(aside, document.body.childNodes[0]);

        let h2 = document.createElement('h2');
        h2.innerText = 'Table of Contents';
        let fragment = document.createDocumentFragment();
        fragment.appendChild(h2);
        fragment.appendChild(list);

        document.getElementById('tocbox').appendChild(fragment);
        setInterval(TOC.currentPos, 100);
    }
    static currentPos() {
        let top = window.scrollY;
        if (top == TOC.lastTop) return;
        TOC.lastTop = top;

        let minDiff = 1000000000, current = null;
        for (let section of TOC.sections) {
            let ot = section.offsetTop - 50;
            if (ot > top) continue;
            let diff = top - ot;
            if (diff < minDiff) {
                minDiff = diff;
                current = section;
            }
        }
        if (TOC.lastLi != current) {
            if (TOC.lastLi != null) TOC.lastLi.classList.remove('current');
            TOC.lastLi = document.getElementById('li_' + current.id);
            if (TOC.lastLi != null) TOC.lastLi.classList.add('current');
        }
    }
};

window.addEventListener('load', TOC.initialize);
