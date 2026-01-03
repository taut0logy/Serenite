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

export function Editor({ content, onChange, isSaving }: EditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            ResizableImageExtension, // Use our custom extension
            Placeholder.configure({
                placeholder:
                    "Write your thoughts here... (Drag & drop images or use the toolbar)",
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
                    "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[300px] h-full",
            },
        },
    });

    // Update editor content when the content prop changes externally (e.g. loading a new entry)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    const addImage = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                // 5MB limit
                toast.error("Image too large. Please use an image under 5MB.");
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result && editor) {
                    editor.chain().focus().setImage({ src: result }).run();
                }
            };
            reader.readAsDataURL(file);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    if (!editor) {
        return null;
    }

    return (
        <div className="flex flex-col w-full h-full overflow-hidden border rounded-md bg-card">
            {/* Toolbar - Fixed at top */}
            <div className="flex-none flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap z-10">
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
            <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
