"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ResizableImageExtension } from "@/components/diary/resizable-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Button } from "@/components/ui/button";
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Image as ImageIcon,
    Loader2,
    Highlighter,
    Type,
} from "lucide-react";
import { useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EditorProps {
    content: string;
    onChange: (content: string) => void;
    isSaving?: boolean;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Images live in the entry as data URIs, so they are encrypted with the rest
 * of the text rather than uploaded somewhere the server could read.
 */
function readImageFile(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) return Promise.resolve(null);
    if (file.size > MAX_IMAGE_BYTES) {
        toast.error("Image too large. Please use an image under 5MB.");
        return Promise.resolve(null);
    }
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) ?? null);
        reader.onerror = () => {
            toast.error("Could not read that image");
            resolve(null);
        };
        reader.readAsDataURL(file);
    });
}

export function Editor({ content, onChange, isSaving }: EditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    // The drop and paste handlers live inside the editor's own config, so they
    // cannot close over `editor` directly.
    const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            ResizableImageExtension, // Use our custom extension
            Placeholder.configure({
                // Plain and unhurried. The old text listed features in
                // brackets, which is a toolbar's job, not a blank page's.
                placeholder: "What's on your mind?",
            }),
            TextStyle,
            FontFamily,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
        ],
        content, // Initial content only
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                className:
                    "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-full pb-24",
            },
            // The placeholder has always offered drag and drop; until now
            // nothing handled either, so a dropped image replaced the whole
            // page with the file.
            handleDrop: (view, event) => {
                const files = Array.from(event.dataTransfer?.files ?? []);
                const images = files.filter((f) => f.type.startsWith("image/"));
                if (images.length === 0) return false;
                event.preventDefault();
                void insertImageFiles(images);
                return true;
            },
            handlePaste: (view, event) => {
                const files = Array.from(event.clipboardData?.files ?? []);
                const images = files.filter((f) => f.type.startsWith("image/"));
                if (images.length === 0) return false;
                event.preventDefault();
                void insertImageFiles(images);
                return true;
            },
        },
    });

    editorRef.current = editor;

    // Update editor content when the content prop changes externally (e.g. loading a new entry)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    const addImage = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const insertImageFile = useCallback(
        async (file: File) => {
            const src = await readImageFile(file);
            if (src) editorRef.current?.chain().focus().setImage({ src }).run();
        },
        []
    );

    const insertImageFiles = useCallback(
        async (files: File[]) => {
            for (const file of files) await insertImageFile(file);
        },
        [insertImageFile]
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) insertImageFile(file);
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    if (!editor) {
        return null;
    }

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-background">
            {/* Toolbar - Fixed at top */}
            <div className="z-10 flex flex-none items-center gap-1 overflow-x-auto border-b bg-muted/30 px-2 py-1.5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                    {/* Font Family Selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 font-normal"
                            >
                                <Type className="h-4 w-4" />
                                <span className="hidden sm:inline-block">
                                    Font
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .setFontFamily("Inter")
                                        .run()
                                }
                                className="font-sans"
                            >
                                Sans Serif
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .setFontFamily("serif")
                                        .run()
                                }
                                className="font-serif"
                            >
                                Serif
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .setFontFamily("monospace")
                                        .run()
                                }
                                className="font-mono"
                            >
                                Monospace
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .setFontFamily("cursive")
                                        .run()
                                }
                                className="italic"
                            >
                                Cursive
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="w-px h-6 bg-border mx-1" />

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                            editor.chain().focus().toggleBold().run()
                        }
                        className={editor.isActive("bold") ? "bg-muted" : ""}
                        title="Bold"
                    >
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                            editor.chain().focus().toggleItalic().run()
                        }
                        className={editor.isActive("italic") ? "bg-muted" : ""}
                        title="Italic"
                    >
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                            editor.chain().focus().toggleHighlight().run()
                        }
                        className={
                            editor.isActive("highlight") ? "bg-muted" : ""
                        }
                        title="Highlight"
                    >
                        <Highlighter className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-border mx-1" />

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                            editor.chain().focus().toggleBulletList().run()
                        }
                        className={
                            editor.isActive("bulletList") ? "bg-muted" : ""
                        }
                        title="Bullet List"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                            editor.chain().focus().toggleOrderedList().run()
                        }
                        className={
                            editor.isActive("orderedList") ? "bg-muted" : ""
                        }
                        title="Ordered List"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-border mx-1" />

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={addImage}
                        title="Insert Image"
                    >
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />

                    <div className="ml-auto flex items-center text-xs text-muted-foreground">
                        {isSaving && (
                            <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Saving...
                            </>
                        )}
                    </div>
                </div>

            {/* Content Area - Flex Grow and Scrollable */}
            <div
                className="min-h-0 flex-1 cursor-text overflow-y-auto px-4 py-4 sm:px-6"
                // Clicking the empty space below the text should put the cursor
                // in it, which is what every editor people already use does.
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) editor.commands.focus("end");
                }}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
