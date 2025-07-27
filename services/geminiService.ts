import { Category } from '../types';
import { Type } from "@google/genai";
import { ICON_MAP } from '../components/icons';


if (!process.env.API_KEY) {
  process.env.API_KEY = "mock_api_key_for_development";
}

const validIcons = Object.keys(ICON_MAP).filter(k => k !== 'Default');

export const responseSchema = {
    type: Type.OBJECT,
    properties: {
        action: {
            type: Type.STRING,
            description: "L'action à effectuer. Peut être 'add', 'update', 'delete', 'rename_category', 'create_category', 'delete_category', 'merge_categories', 'query', 'chat', ou 'confirm_add'.",
            enum: ['add', 'update', 'delete', 'rename_category', 'create_category', 'delete_category', 'merge_categories', 'query', 'chat', 'confirm_add'],
        },
        items: {
            type: Type.ARRAY,
            description: "Liste d'éléments pour les actions 'add', 'update', ou 'delete'.",
            items: {
                type: Type.OBJECT,
                properties: {
                    content: { type: Type.STRING, description: "Contenu original de l'élément à cibler, ou nouveau contenu pour 'add'." },
                    categoryName: { type: Type.STRING, description: "Nom de la catégorie de l'élément." },
                    completed: { type: Type.BOOLEAN, description: "Statut d'achèvement." },
                    dueDate: { type: Type.STRING, description: "Date d'échéance (YYYY-MM-DD)." },
                    newContent: { type: Type.STRING, description: "Nouveau contenu pour renommer un élément (action 'update')." },
                    notes: { type: Type.STRING, description: "Notes associées à l'élément." }
                },
                required: ["content", "categoryName"]
            },
        },
        category_details: {
            type: Type.OBJECT,
            description: "Détails pour les actions sur les catégories: 'create', 'rename', 'delete', 'merge'.",
            properties: {
                name: { type: Type.STRING, description: "Nom de la catégorie à créer, renommer (ancien nom) ou supprimer." },
                newName: { type: Type.STRING, description: "Nouveau nom pour la catégorie à renommer." },
                icon: { type: Type.STRING, description: "Icône pour une nouvelle catégorie.", enum: validIcons },
                sourceName: { type: Type.STRING, description: "Nom de la catégorie source à fusionner." },
                destinationName: { type: Type.STRING, description: "Nom de la catégorie de destination pour la fusion." },
            }
        },
        filter: {
            type: Type.OBJECT,
            description: "Filtre pour la suppression en masse d'éléments.",
             properties: {
                categoryName: { type: Type.STRING },
                completed: { type: Type.BOOLEAN }
            }
        },
        response: {
            type: Type.STRING,
            description: "Une réponse conviviale et conversationnelle pour l'utilisateur, toujours en français.",
        },
    },
    required: ["action", "response"]
};

export const getSystemInstruction = (categories: Category[], activeCategoryId: string | null): string => {
    const activeCategory = categories.find(c => c.id === activeCategoryId);

    const context = {
        activeCategory: activeCategory ? activeCategory.name : 'Aucune',
        allCategories: categories.map(c => c.name),
        lists: categories.map(c => ({
            categoryName: c.name,
            itemCount: c.items.length,
            items: c.items.slice(0, 3).map(i => i.content) // show only first 3 item names for brevity
        }))
    };
    
    return `Tu es un assistant de liste de tâches intelligent. Réponds toujours en français.
- La date d'aujourd'hui est le ${new Date().toLocaleDateString('fr-FR')}. Maintiens le contexte de notre conversation.
- **Gestion des éléments** :
  - Pour ajouter un élément, utilise 'add'. Avant d'ajouter, vérifie s'il existe un élément très similaire. Si oui, utilise l'action 'confirm_add' et demande à l'utilisateur dans ta réponse s'il veut vraiment l'ajouter.
  - Pour modifier un élément (nom, statut, date, notes), utilise 'update'. Utilise 'content' pour trouver l'élément et les autres champs pour les mises à jour.
  - Pour supprimer des éléments, utilise 'delete' avec 'items' pour des cibles précises ou 'filter' pour une suppression en masse.
- **Gestion des catégories** :
  - Pour **créer une catégorie**, utilise 'create_category' et fournis 'name' et 'icon' dans 'category_details'. Les icônes valides sont: ${validIcons.join(', ')}.
  - Pour **renommer une catégorie**, utilise 'rename_category' et fournis son nom actuel dans 'name' et le nouveau dans 'newName' de 'category_details'.
  - Pour **fusionner des listes**, utilise 'merge_categories' avec 'sourceName' et 'destinationName' dans 'category_details'. Les éléments de la source seront déplacés et la source supprimée.
  - Pour **supprimer une catégorie**, utilise 'delete_category' avec son 'name' dans 'category_details'. **ATTENTION**: Si la catégorie à supprimer contient des éléments, ne la supprime PAS tout de suite. Réponds d'abord avec l'action 'chat', informe l'utilisateur que la liste n'est pas vide (fais un bref résumé des éléments qu'elle contient), et demande une confirmation claire. Ce n'est qu'après avoir reçu sa confirmation dans un message suivant que tu enverras une nouvelle action 'delete_category'.
- **Contexte** :
  - Si une catégorie n'est pas spécifiée, utilise la catégorie active : '${context.activeCategory}'. Sinon, demande.
  - Les catégories disponibles sont : ${context.allCategories.join(', ')}.
- Voici l'état actuel des listes (résumé) : ${JSON.stringify(context.lists, null, 2)}`;
};