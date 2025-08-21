"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {createCompanion} from "@/lib/actions/companion.actions";
import {redirect} from "next/navigation";

const formSchema = z.object({
    name: z.string().min(1, { message: 'Companion is required.'}),
    duration: z.coerce.number().min(1, { message: 'Duration is required.'}),
})

const CompanionForm = () => {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            duration: 15,
        },
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        // Add default values for removed fields
        const companionData = {
            ...values,
            topic: 'General conversation', // Default topic
            subject: 'general',           // Default subject
            voice: 'female',              // Default voice
            style: 'casual'               // Default style
        };
        
        const companion = await createCompanion(companionData);

        if(companion) {
            redirect(`/companions/${companion.id}`);
        } else {
            console.log('Failed to create a companion');
            redirect('/');
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Companion name</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Enter the companion name"
                                    {...field}
                                    className="input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estimated session duration in minutes</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="15"
                                    {...field}
                                    className="input"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full cursor-pointer">Build Your Companion</Button>
            </form>
        </Form>
    )
}

export default CompanionForm
