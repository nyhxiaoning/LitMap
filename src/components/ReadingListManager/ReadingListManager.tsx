import { useMemo, useState, type FormEvent } from "react";
import type { BookData } from "../../types";
import { useUIContext } from "../../context/hooks";
import BookCover from "../BookCover/BookCover";
import styles from "./ReadingListManager.module.css";
import { getContinent } from "../../utils/regionUtils";
import { createBook, deleteBook, updateBook } from "../../api/booksApi";

interface ReadingListManagerProps { books: BookData[]; }
interface NewBookForm { title: string; author: string; category: string; country: string; tags: string; year: string; url: string; }

const emptyForm: NewBookForm = { title: "", author: "", category: "", country: "", tags: "", year: "", url: "" };

export default function ReadingListManager({ books }: ReadingListManagerProps) {
  const { state, dispatch } = useUIContext();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | "saved">("all");
  const [isAdding, setIsAdding] = useState(true);
  const [form, setForm] = useState<NewBookForm>(emptyForm);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [urlEditorBookId, setUrlEditorBookId] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");

  const visibleBooks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesMode = mode === "all" || state.readingListBookIds.includes(book.id);
      const matchesQuery = !normalized || [book.title, book.author, book.country, book.city, ...book.tags]
        .join(" ").toLowerCase().includes(normalized);
      return matchesMode && matchesQuery;
    });
  }, [books, mode, query, state.readingListBookIds]);

  const categoryOptions = useMemo(
    () => [...new Set(books.flatMap((book) => book.tags.slice(1, 3)))].slice(0, 24),
    [books],
  );
  const countryOptions = useMemo(
    () => [...new Set(books.map((book) => book.country))].filter(Boolean).sort(),
    [books],
  );

  const handleAddBook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    const author = form.author.trim();
    if (!title || !author) return;

    const category = form.category.trim() || "未分类";
    const tags = form.tags.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean);
    const year = form.year.trim();
    const existingBook = editingCustomId ? books.find((book) => book.id === editingCustomId) : undefined;
    const customBook: BookData = {
      rank: existingBook?.rank ?? Math.max(0, ...books.map((book) => book.rank)) + 1,
      id: existingBook?.id ?? `custom-${Date.now()}`,
      sliderVal: year && Number(year) < 2000 ? 6 : 7,
      century: year && Number(year) < 2000 ? "20世纪" : "21世纪",
      lat: 30,
      lng: 15,
      country: form.country.trim() || "自定义书目",
      city: category,
      title,
      author,
      color: "#5b8c85",
      coverUrl: "",
      tags: [category, ...(year ? [`${year}年`] : []), ...tags],
      quote: "",
      desc: `${author}的《${title}》，归入“${category}”分类。`,
      realViewName: "",
      realViewUrl: "",
      realViewQuote: "",
      url: form.url.trim() || undefined,
    };

    try {
      const savedBook = editingCustomId
        ? await updateBook(customBook.id, customBook)
        : await createBook(customBook);
      dispatch({ type: editingCustomId ? "UPDATE_CUSTOM_BOOK" : "ADD_CUSTOM_BOOK", payload: savedBook });
      dispatch({ type: "SET_BOOK_URL", payload: { bookId: savedBook.id, url: savedBook.url || "" } });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "图书保存失败，请稍后重试");
      return;
    }
    setForm(emptyForm);
    setIsAdding(false);
    setEditingCustomId(null);
    setMode("all");
  };

  const openCustomEdit = (book: BookData) => {
    const year = book.tags.find((tag) => /^\d{4}/.test(tag))?.slice(0, 4) || "";
    setForm({
      title: book.title,
      author: book.author,
      category: book.tags[0] || "",
      country: book.country === "自定义书目" ? "" : book.country,
      tags: book.tags.slice(1).filter((tag) => !/^\d{4}/.test(tag)).join(", "),
      year,
      url: state.bookUrlOverrides[book.id] || book.url || "",
    });
    setEditingCustomId(book.id);
    setIsAdding(true);
  };

  const saveBookUrl = async (bookId: string) => {
    const value = urlDraft.trim();
    const url = value && !/^https?:\/\//i.test(value) ? `https://${value}` : value;
    try {
      await updateBook(bookId, { url: url || undefined });
      dispatch({ type: "SET_BOOK_URL", payload: { bookId, url } });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "链接保存失败，请稍后重试");
      return;
    }
    setUrlEditorBookId(null);
  };

  if (!state.isReadingListManagerOpen) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="书单管理">
      <div className={`glass-strong ${styles.manager}`}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>阅</span>
            <div><h2>书单管理</h2><p>管理图书与我的收藏</p></div>
          </div>
          <button type="button" className={styles.primaryBtn} onClick={() => { setEditingCustomId(null); setForm(emptyForm); setIsAdding((open) => !open); }}>
            {isAdding && !editingCustomId ? "收起新增" : "新增图书"}
          </button>
          <button type="button" className={styles.closeBtn} onClick={() => dispatch({ type: "TOGGLE_READING_LIST_MANAGER" })} aria-label="关闭书单管理">×</button>
        </header>

        {isAdding && (
          <form className={styles.addForm} onSubmit={handleAddBook}>
            <div className={styles.formTitle}><strong>新增图书</strong><span>按当前图书的分类、标签和作者信息创建一条新记录</span></div>
            <label>书名<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="输入书名" /></label>
            <label>作者<input required value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} placeholder="输入作者" /></label>
            <label>分类<input list="book-categories" required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="如：古典文学、哲学" /></label>
            <datalist id="book-categories">{categoryOptions.map((category) => <option key={category} value={category} />)}</datalist>
            <label>所属国家<input list="book-countries" required value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} placeholder="如：中国、法国、日本" /></label>
            <datalist id="book-countries">{countryOptions.map((country) => <option key={country} value={country} />)}</datalist>
            <label>标签<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="用逗号分隔，如：成长,思想,小说" /></label>
            <label>年份<input type="number" min="1" max="2100" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} placeholder="可选" /></label>
            <label>图书 URL<input type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://..." /></label>
            <button type="submit" className={styles.saveNewBtn}>保存图书</button>
          </form>
        )}

        <div className={styles.toolbar}>
          <div className={styles.tabs}>
            <button type="button" className={mode === "all" ? styles.activeTab : ""} onClick={() => setMode("all")}>全部图书 <b>{books.length}</b></button>
            <button type="button" className={mode === "saved" ? styles.activeTab : ""} onClick={() => setMode("saved")}>我的书单 <b>{state.readingListBookIds.length}</b></button>
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索书名、作者、标签..." aria-label="搜索书单" />
        </div>

        <div className={styles.tableHead}><span>书名</span><span>作者</span><span>所属</span><span>年份</span><span>标签</span><span>链接</span><span>操作</span></div>
        <div className={styles.tableBody}>
          {visibleBooks.map((book) => {
            const isSaved = state.readingListBookIds.includes(book.id);
            const bookUrl = state.bookUrlOverrides[book.id] || book.url || "";
            const isCustom = state.customBooks.some((customBook) => customBook.id === book.id);
            return (
              <article className={styles.row} key={book.id}>
                <button type="button" className={styles.bookCell} onClick={() => dispatch({ type: "SELECT_BOOK", payload: book.id })}>
                  <span className={styles.thumb}><BookCover book={book} /></span>
                  <strong>{book.title}</strong>
                </button>
                <span>{book.author}</span>
                <span className={styles.regionCell}>
                  <button type="button" onClick={() => { dispatch({ type: "SET_REGION_FILTER", payload: { country: getContinent(book.country) } }); dispatch({ type: "TOGGLE_READING_LIST_MANAGER" }); }}>{getContinent(book.country)}</button>
                  <button type="button" onClick={() => { dispatch({ type: "SET_REGION_FILTER", payload: { country: book.country } }); dispatch({ type: "TOGGLE_READING_LIST_MANAGER" }); }}>{book.country}</button>
                </span>
                <span>{book.tags.find((tag) => /^\d{4}/.test(tag))?.slice(0, 4) || book.century}</span>
                <span className={styles.tags}>{book.tags.slice(0, 3).map((tag) => <em key={tag}>{tag}</em>)}</span>
                <span className={styles.urlCell}>
                  {urlEditorBookId === book.id ? (
                    <span className={styles.urlEditor}>
                      <input value={urlDraft} onChange={(event) => setUrlDraft(event.target.value)} placeholder="https://..." aria-label={`编辑${book.title}链接`} />
                      <button type="button" onClick={() => saveBookUrl(book.id)}>保存</button>
                    </span>
                  ) : bookUrl ? <a href={bookUrl} target="_blank" rel="noreferrer">打开链接</a> : <span>未设置</span>}
                </span>
                <div className={styles.actionCell}>
                  <button type="button" className={styles.linkBtn} onClick={() => { setUrlEditorBookId(book.id); setUrlDraft(bookUrl); }}>编辑链接</button>
                  <button type="button" className={isSaved ? styles.removeBtn : styles.addBtn} onClick={() => dispatch({ type: "TOGGLE_READING_LIST_BOOK", payload: book.id })}>
                    {isSaved ? "移出书单" : "加入书单"}
                  </button>
                  {isCustom && (
                    <button type="button" className={styles.editBtn} onClick={() => openCustomEdit(book)}>编辑</button>
                  )}
                  {isCustom && (
                    <button type="button" className={styles.deleteBtn} onClick={() => {
                      if (window.confirm(`确定删除《${book.title}》吗？`)) {
                        deleteBook(book.id).then(() => dispatch({ type: "REMOVE_CUSTOM_BOOK", payload: book.id })).catch((error) => window.alert(error instanceof Error ? error.message : "图书删除失败，请稍后重试"));
                      }
                    }}>删除</button>
                  )}
                </div>
              </article>
            );
          })}
          {visibleBooks.length === 0 && <div className={styles.empty}>没有匹配的图书</div>}
        </div>
      </div>
    </div>
  );
}
