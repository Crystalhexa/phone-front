"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export default function SearchWithSelect() {
  const [query, setQuery] = useState("");
  const [option, setOption] = useState("barcode");

  const handleSearch = async() => {
    const response = await fetch(`/api/return/${option}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: query }),
      })
  };

  return (
    <div className="flex gap-2 items-center w-full max-w-xl mx-auto">
      {/* Select Dropdown */}
      <Select defaultValue={option} onValueChange={setOption}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="barcode">Barcode</SelectItem>
          <SelectItem value="sales_order">Sales order</SelectItem>
        </SelectContent>
      </Select>
      {/* Search Input */}
      <Input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1"
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
      />
      {/* Search Button */}
      <Button onClick={handleSearch}>
        <Search className="w-4 h-4 mr-1" />
        Search
      </Button>
    </div>
  );
}
